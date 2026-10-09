/* Source-stage co-op: the host simulates; peers send inputs through Firebase RTDB. */
(function (root) {
  'use strict';
  const PROTOCOL = 'source-park-v1';
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

  class SourceParkNetwork {
    constructor(onRoom, onError) {
      this.onRoom = onRoom;
      this.onError = onError;
      this.id = 'p' + (root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).slice(2) + Date.now().toString(36));
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
      // A live subscription warms the local transaction cache before joining.
      const warm = () => {};
      ref.on('value', warm);
      try {
        await ref.once('value');
        const result = await ref.transaction(room => {
          if (create) {
            if (room) return;
            room = { protocol: PROTOCOL, host: this.id, status: 'lobby', created: Date.now() };
          }
          if (!room || room.protocol !== PROTOCOL || room.status !== 'lobby' || Object.keys(room.players || {}).length >= 8) return;
          room.players = room.players || {};
          room.players[this.id] = { name: '참치 ' + this.id.slice(-3), joined: Date.now(), ready: room.host === this.id };
          return room;
        });
        if (!result.committed) throw Error('참가할 수 없어요. 방 코드·인원·진행 상태를 확인해주세요');
        this.ref = ref;
        this.code = code;
        this.seq = this.jumpSeq = 0;
        this.lastJump = false;
        this.player = ref.child('players/' + this.id);
        this.disconnects = [this.player.onDisconnect(), ref.child('inputs/' + this.id).onDisconnect()];
        await Promise.all(this.disconnects.map(disconnect => disconnect.remove()));
        this.listener = snap => {
          if (this.ref !== ref) return;
          const room = snap.val();
          const wasHost = this.host;
          this.room = room;
          this.host = !!room && room.host === this.id;
          this.justBecameHost = this.host && !wasHost;
          this.inputs = room && room.inputs || {};
          if (!room) { this.error('방이 닫혔어요'); return; }
          try { if (this.onRoom) this.onRoom(room); } catch (error) { this.error(error); }
          if (!room.players || !room.players[room.host]) this.elect(ref, room);
        };
        ref.on('value', this.listener, error => this.error(error));
      } catch (error) {
        if (this.ref === ref) await this.leave();
        throw error;
      } finally { ref.off('value', warm); }
      return this.room;
    }
    elect(ref, room) {
      if (this.ref !== ref) return;
      const next = Object.keys(room.players || {}).sort()[0];
      if (next !== this.id) return;
      this.write(ref, () => ref.transaction(current => {
        if (!current || current.players && current.players[current.host]) return;
        const candidate = Object.keys(current.players || {}).sort()[0];
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
      if (!this.ref) return Promise.resolve(false);
      const jump = !!input.jump;
      if (jump && !this.lastJump) this.jumpSeq++;
      this.lastJump = jump;
      const packet = { left: !!input.left, right: !!input.right, jump, up: !!input.up, jumpSeq: this.jumpSeq, seq: ++this.seq, at: Date.now() };
      const ref = this.ref;
      return this.write(ref, () => ref.child('inputs/' + this.id).set(packet));
    }
    publish(snapshot) {
      if (!this.host || !this.ref) return Promise.resolve(false);
      const ref = this.ref;
      return this.write(ref, () => ref.update({ snapshot: cleanSnapshot(snapshot), status: snapshot.status === 'play' ? 'game' : snapshot.status }));
    }
    async start(snapshot) {
      if (!this.host || !this.ref) throw Error('방장만 시작할 수 있어요');
      const state = cleanSnapshot(snapshot);
      const ref = this.ref;
      const result = await this.track(ref, () => ref.transaction(room => {
        if (!room || room.host !== this.id || room.status !== 'lobby') return;
        const players = Object.entries(room.players || {});
        if (players.length < 2 || players.length > 8 || players.some(([id, player]) => id !== this.id && !player.ready)) return;
        room.snapshot = state;
        room.status = 'game';
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
        room.players[this.id].ready = room.host === this.id || !!ready;
        return room;
      }));
    }
    lobby() {
      if (!this.host || !this.ref) return Promise.resolve(false);
      const ref = this.ref;
      return this.write(ref, () => ref.transaction(room => {
        if (!room || room.host !== this.id) return;
        room.status = 'lobby';
        room.snapshot = null;
        for (const id of Object.keys(room.players || {})) room.players[id].ready = id === this.id;
        return room;
      }));
    }
    leave() {
      if (this.leaving) return this.leaving;
      const ref = this.ref;
      const disconnects = this.disconnects;
      if (ref && this.listener) ref.off('value', this.listener);
      this.ref = this.room = this.player = this.code = null;
      this.host = this.justBecameHost = false;
      this.inputs = {};
      this.disconnects = [];
      if (!ref) return Promise.resolve();
      this.leaving = this.finishLeave(ref, disconnects).finally(() => { this.leaving = null; });
      return this.leaving;
    }
    async finishLeave(ref, disconnects) {
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
        await ref.update({ ['players/' + this.id]: null, ['inputs/' + this.id]: null });
        await ref.once('value');
        const result = await ref.transaction(room => {
          // A cold cache can be null while the server still has members. Returning
          // null submits a compare-and-set so Firebase fetches/retries server data.
          if (!room) return null;
          if (room.players) delete room.players[this.id];
          if (room.inputs) delete room.inputs[this.id];
          const remaining = Object.keys(room.players || {}).sort();
          if (!remaining.length) return null;
          if (!room.players[room.host]) {
            room.host = remaining[0];
            room.players[room.host].ready = true;
          }
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
