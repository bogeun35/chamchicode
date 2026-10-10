/* Source-stage co-op: the host simulates; peers send inputs through Firebase RTDB. */
(function (root) {
  'use strict';
  const PROTOCOL = 'source-park-v2';
  const CONFIG = {
    apiKey: 'AIzaSyD8_pSiOVOWmCitHl_nWcgSZobMFI5NgXM',
    authDomain: 'rolling2-17a8f.firebaseapp.com',
    databaseURL: 'https://rolling2-17a8f-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'rolling2-17a8f'
  };
  let sdkLoading;
  function script(url) {
    return new Promise((resolve, reject) => {
      const tag = root.document.createElement('script');
      tag.src = url;
      tag.async = true;
      tag.onload = resolve;
      tag.onerror = () => { tag.remove(); reject(Error('온라인 연결을 불러오지 못했어요')); };
      root.document.head.appendChild(tag);
    });
  }
  async function firebaseSDK() {
    if (root.firebase && typeof root.firebase.database === 'function') return root.firebase;
    if (!root.document) throw Error('Firebase SDK가 필요해요');
    if (!sdkLoading) sdkLoading = (async () => {
      if (!root.firebase) await script('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
      await script('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js');
      return root.firebase;
    })().catch(error => { sdkLoading = null; throw error; });
    return sdkLoading;
  }
  const cleanSnapshot = value => JSON.parse(JSON.stringify(value, (_key, item) => item === undefined ? null : item));
  const randomId = prefix => prefix + (root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).slice(2) + Date.now().toString(36));
  function playerId() {
    try {
      const saved = root.localStorage && root.localStorage.getItem('source-park-player-id');
      if (saved && /^p[a-zA-Z0-9]{8,80}$/.test(saved)) return saved;
      const id = randomId('p');
      if (root.localStorage) root.localStorage.setItem('source-park-player-id', id);
      return id;
    } catch (_) { return randomId('p'); }
  }
  function online(room, id) {
    const player = room && room.players && room.players[id];
    const connection = player && room.connections && room.connections[player.connectionId];
    return !!connection && connection.playerId === id && connection.online === true;
  }
  const onlineIds = room => Object.keys(room && room.players || {}).filter(id => online(room, id)).sort();
  function resetRoster(room) {
    if (room.status !== 'lobby' || room.restartPending) {
      room.status = 'lobby';
      room.snapshot = null;
      room.restartPending = true;
      room.revision = (room.revision || 0) + 1;
      for (const id of Object.keys(room.players || {})) room.players[id].ready = false;
    }
  }

  class SourceParkNetwork {
    constructor(onRoom, onError, onRemoved) {
      this.onRoom = onRoom;
      this.onError = onError;
      this.onRemoved = onRemoved;
      this.id = playerId();
      this.connectionId = null;
      this.localOnline = true;
      this.room = null;
      this.host = false;
      this.ref = null;
      this.code = null;
      this.inputs = {};
      this.justBecameHost = false;
      this.seq = 0;
      this.jumpSeq = 0;
      this.lastJump = false;
      this.disconnects = [];
      this.pending = new Map();
      this.leaving = null;
    }
    error(error) {
      try { if (this.onError) this.onError(error && error.message || String(error)); } catch (_) { /* UI errors must not escape listeners. */ }
    }
    connected(id) { return online(this.room, id) && (id !== this.id || this.localOnline); }
    connectedIds() { return onlineIds(this.room).filter(id => id !== this.id || this.localOnline); }
    async init() {
      if (this.db) return;
      const firebase = await firebaseSDK();
      const app = firebase.apps.find(app => app.options && app.options.databaseURL === CONFIG.databaseURL) || firebase.initializeApp(CONFIG, 'source-park');
      this.db = app.database();
    }
    async enter(code, create = false) {
      code = String(code || '').trim().toUpperCase();
      if (!/^[A-Z0-9]{4,8}$/.test(code)) throw Error('방 코드는 영문·숫자 4~8자리로 입력해주세요');
      if (this.leaving) await this.leaving;
      if (this.ref) await this.leave();
      await this.init();
      const ref = this.db.ref('games/park_source_' + code);
      const connectionId = randomId('c');
      // A live subscription warms the local transaction cache before joining.
      const warm = () => {};
      ref.on('value', warm);
      try {
        await ref.once('value');
        const result = await ref.transaction(room => {
          if (create) {
            if (room) return;
            room = { protocol: PROTOCOL, host: this.id, status: 'lobby', stageId: 'st_w_01_01', revision: 0, created: Date.now() };
          }
          if (!room || room.protocol !== PROTOCOL || room.kicked && room.kicked[this.id]) return;
          room.players = room.players || {};
          const returning = !!room.players[this.id];
          if (!returning && Object.keys(room.players).length >= 8) return;
          if (!returning) {
            room.players[this.id] = { name: '참치 ' + this.id.slice(-3), joined: Date.now(), ready: room.host === this.id };
            resetRoster(room);
          }
          room.players[this.id].connectionId = connectionId;
          room.connections = room.connections || {};
          room.connections[connectionId] = { playerId: this.id, online: true, at: Date.now() };
          return room;
        });
        if (!result.committed) throw Error('참가할 수 없어요. 방 코드·인원·진행 상태를 확인해주세요');
        this.ref = ref;
        this.code = code;
        this.connectionId = connectionId;
        this.localOnline = true;
        const joinedRoom = result.snapshot && result.snapshot.val ? result.snapshot.val() : (await ref.once('value')).val();
        const previousInput = joinedRoom && joinedRoom.inputs && joinedRoom.inputs[this.id];
        this.seq = previousInput && previousInput.seq || 0;
        this.jumpSeq = previousInput && previousInput.jumpSeq || 0;
        this.lastJump = false;
        this.player = ref.child('players/' + this.id);
        this.disconnects = [];
        await this.armPresence(ref, connectionId);
        this.listener = snap => {
          if (this.ref !== ref) return;
          const room = snap.val();
          const wasHost = this.host;
          this.room = room;
          if (!room || !room.players || !room.players[this.id] || room.kicked && room.kicked[this.id] || room.players[this.id].connectionId !== connectionId) {
            this.revoked(ref, room && room.kicked && room.kicked[this.id] ? 'kicked' : room && room.players && room.players[this.id] ? 'replaced' : 'removed');
            return;
          }
          this.host = room.host === this.id && this.connected(this.id);
          this.justBecameHost = this.host && !wasHost;
          this.inputs = Object.fromEntries(Object.entries(room.inputs || {}).filter(([id, input]) => online(room, id) && input.connectionId === room.players[id].connectionId));
          try { if (this.onRoom) this.onRoom(room); } catch (error) { this.error(error); }
          if (!online(room, room.host)) this.elect(ref, room);
        };
        ref.on('value', this.listener, error => this.error(error));
        this.infoRef = this.db.ref('.info/connected');
        this.infoListener = snap => {
          if (this.ref !== ref) return;
          this.localOnline = snap.val() === true;
          if (!this.localOnline) {
            this.host = false;
            try { if (this.onRoom && this.room) this.onRoom(this.room); } catch (error) { this.error(error); }
            return;
          }
          this.write(ref, async () => {
            await this.armPresence(ref, connectionId);
            if (this.ref !== ref || !this.room || !this.room.players[this.id] || this.room.players[this.id].connectionId !== connectionId) return;
            await ref.child('connections/' + connectionId).set({ playerId: this.id, online: true, at: Date.now() });
          });
        };
        this.infoRef.on('value', this.infoListener, error => this.error(error));
      } catch (error) {
        if (this.ref === ref) await this.leave();
        throw error;
      } finally { ref.off('value', warm); }
      return this.room;
    }
    async armPresence(ref, connectionId) {
      const disconnect = ref.child('connections/' + connectionId).onDisconnect();
      this.disconnects.push(disconnect);
      await disconnect.update({ online: false, at: Date.now() });
    }
    revoked(ref, reason) {
      if (this.ref !== ref) return;
      this.detach(ref);
      this.ref = this.player = this.code = null;
      this.host = this.justBecameHost = false;
      this.inputs = {};
      const disconnects = this.disconnects;
      this.disconnects = [];
      Promise.allSettled([...this.pending.get(ref) || []]).then(async () => {
        await ref.child('connections/' + this.connectionId).update({ online: false });
        await Promise.all(disconnects.map(disconnect => disconnect.cancel()));
      }).catch(error => this.error(error));
      try { if (this.onRemoved) this.onRemoved(reason); } catch (error) { this.error(error); }
      this.error(reason === 'kicked' ? '방장이 강퇴했어요' : reason === 'replaced' ? '같은 참가자가 다른 창에서 접속했어요' : '방 참가가 종료됐어요');
    }
    detach(ref) {
      if (this.listener) ref.off('value', this.listener);
      if (this.infoRef && this.infoListener) this.infoRef.off('value', this.infoListener);
      this.infoRef = this.infoListener = null;
    }
    elect(ref, room) {
      if (this.ref !== ref) return;
      if (!this.localOnline) return;
      const next = onlineIds(room)[0];
      if (next !== this.id) return;
      this.write(ref, () => ref.transaction(current => {
        if (!current || online(current, current.host)) return;
        const candidate = onlineIds(current)[0];
        if (candidate !== this.id) return;
        current.host = this.id;
        current.players[this.id].ready = true;
        return current;
      }));
    }
    track(ref, operation) {
      // Register before running: synchronous local Firebase events may trigger leave().
      const pending = this.pending.get(ref) || new Set();
      this.pending.set(ref, pending);
      const promise = Promise.resolve().then(operation);
      pending.add(promise);
      const finished = () => {
        pending.delete(promise);
        if (!pending.size) this.pending.delete(ref);
      };
      promise.then(finished, finished);
      return promise;
    }
    write(ref, operation) {
      return this.track(ref, operation).then(() => true, error => { this.error(error); return false; });
    }
    input(input) {
      if (!this.ref || !this.localOnline) return Promise.resolve(false);
      const jump = !!input.jump;
      if (jump && !this.lastJump) this.jumpSeq++;
      this.lastJump = jump;
      const packet = { left: !!input.left, right: !!input.right, jump, up: !!input.up, connectionId: this.connectionId, jumpSeq: this.jumpSeq, seq: ++this.seq, at: Date.now() };
      const ref = this.ref;
      return this.write(ref, () => ref.child('inputs/' + this.id).set(packet));
    }
    publish(snapshot) {
      if (!this.host || !this.ref) return Promise.resolve(false);
      const ref = this.ref;
      const revision = this.room && this.room.revision || 0;
      const connectionId = this.connectionId;
      return this.write(ref, () => ref.transaction(room => {
        if (!room || room.host !== this.id || !online(room, this.id) || room.players[this.id].connectionId !== connectionId || room.status === 'lobby' || (room.revision || 0) !== revision) return;
        room.snapshot = cleanSnapshot(snapshot);
        room.status = snapshot.status === 'play' ? 'game' : snapshot.status;
        return room;
      }));
    }
    async start(snapshot) {
      if (!this.host || !this.ref) throw Error('방장만 시작할 수 있어요');
      const state = cleanSnapshot(snapshot);
      const ref = this.ref;
      const result = await this.track(ref, () => ref.transaction(room => {
        if (!room || room.host !== this.id || !online(room, this.id) || room.status !== 'lobby') return;
        if (state.stageId && state.stageId !== (room.stageId || 'st_w_01_01')) return;
        const players = Object.entries(room.players || {});
        if (players.length < 2 || players.length > 8 || onlineIds(room).length < 2 || players.some(([id, player]) => online(room, id) && id !== this.id && !player.ready)) return;
        room.snapshot = state;
        room.status = 'game';
        room.restartPending = false;
        return room;
      })).catch(error => { this.error(error); throw error; });
      if (!result.committed) throw Error('2~8명이 참가하고 모두 준비해야 시작할 수 있어요');
      return true;
    }
    ready(ready) {
      if (!this.ref) return Promise.resolve(false);
      const ref = this.ref;
      return this.write(ref, () => ref.transaction(room => {
        if (!room || room.status !== 'lobby' || !room.players || !room.players[this.id]) return;
        room.players[this.id].ready = !!ready;
        return room;
      }));
    }
    async selectStage(stageId) {
      if (!this.host || !this.ref) throw Error('방장만 라운드를 선택할 수 있어요');
      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(stageId)) throw Error('라운드 ID를 확인해주세요');
      const ref = this.ref;
      const result = await this.track(ref, () => ref.transaction(room => {
        if (!room || room.host !== this.id || room.status !== 'lobby') return;
        room.stageId = stageId;
        room.snapshot = null;
        room.restartPending = false;
        room.revision = (room.revision || 0) + 1;
        for (const id of Object.keys(room.players || {})) room.players[id].ready = id === this.id;
        return room;
      }));
      if (!result.committed) throw Error('대기실에서 라운드를 선택해주세요');
    }
    lobby() {
      if (!this.host || !this.ref) return Promise.resolve(false);
      const ref = this.ref;
      return this.write(ref, () => ref.transaction(room => {
        if (!room || room.host !== this.id) return;
        room.status = 'lobby';
        room.snapshot = null;
        room.restartPending = false;
        room.revision = (room.revision || 0) + 1;
        for (const id of Object.keys(room.players || {})) room.players[id].ready = id === this.id;
        return room;
      }));
    }
    async kick(id) {
      if (!this.host || !this.ref) throw Error('방장만 강퇴할 수 있어요');
      if (id === this.id) throw Error('자신은 강퇴할 수 없어요');
      const ref = this.ref;
      const result = await this.track(ref, () => ref.transaction(room => {
        if (!room || room.host !== this.id || !online(room, this.id) || !room.players || !room.players[id]) return;
        room.kicked = room.kicked || {};
        room.kicked[id] = { at: Date.now(), by: this.id };
        delete room.players[id];
        if (room.inputs) delete room.inputs[id];
        for (const key of Object.keys(room.connections || {})) if (room.connections[key].playerId === id) delete room.connections[key];
        resetRoster(room);
        return room;
      }));
      if (!result.committed) throw Error('강퇴할 참가자를 확인해주세요');
      return true;
    }
    async unblock(id) {
      if (!this.host || !this.ref) throw Error('방장만 강퇴를 해제할 수 있어요');
      const ref = this.ref;
      const result = await this.track(ref, () => ref.transaction(room => {
        if (!room || room.host !== this.id || !online(room, this.id)) return;
        if (room.kicked) delete room.kicked[id];
        return room;
      }));
      if (!result.committed) throw Error('강퇴 해제를 완료하지 못했어요');
      return true;
    }
    leave() {
      if (this.leaving) return this.leaving;
      const ref = this.ref;
      const disconnects = this.disconnects;
      const connectionId = this.connectionId;
      if (ref) this.detach(ref);
      this.ref = this.room = this.player = this.code = null;
      this.host = this.justBecameHost = false;
      this.inputs = {};
      this.disconnects = [];
      if (!ref) return Promise.resolve();
      this.leaving = this.finishLeave(ref, disconnects, connectionId).finally(() => { this.leaving = null; });
      return this.leaving;
    }
    async finishLeave(ref, disconnects, connectionId) {
      // Keep a listener while the transaction runs, then detach only our listener.
      const warm = () => {};
      ref.on('value', warm);
      try {
        // A delete must follow every previously issued write's server acknowledgement.
        // Otherwise a delayed snapshot/input update can recreate the deleted room.
        await Promise.allSettled([...this.pending.get(ref) || []]);
        // Remove our membership with an acknowledged atomic update first. Root
        // transactions can contend with an active host's snapshot writes; that
        // contention must never prevent a peer from actually leaving the room.
        await ref.update({ ['players/' + this.id]: null, ['inputs/' + this.id]: null, ['connections/' + connectionId]: null });
        await ref.once('value');
        const result = await ref.transaction(room => {
          // A cold cache can be null while the server still has members. Returning
          // null submits a compare-and-set so Firebase fetches/retries server data.
          if (!room) return null;
          if (room.players) delete room.players[this.id];
          if (room.inputs) delete room.inputs[this.id];
          const remaining = Object.keys(room.players || {}).sort();
          if (!remaining.length) return null;
          if (!online(room, room.host)) {
            room.host = onlineIds(room)[0] || (room.players[room.host] ? room.host : remaining[0]);
            room.players[room.host].ready = true;
          }
          resetRoster(room);
          return room;
        });
        if (!result.committed) throw Error('방 나가기 처리가 완료되지 않았어요');
        await Promise.all(disconnects.map(disconnect => disconnect.cancel()));
      } catch (error) { this.error(error); } finally { ref.off('value', warm); }
    }
  }
  root.SourceParkNetwork = SourceParkNetwork;
  if (typeof module !== 'undefined' && module.exports) module.exports = SourceParkNetwork;
})(typeof window !== 'undefined' ? window : globalThis);
