(() => {
  async function prepare(app, sessionId, quotaOnly = false) {
    if (!sessionId) {
      const snapshot = await app.database().ref('lephemere/operationStatus').once('value');
      sessionId = snapshot.val()?.sessionId;
    }
    if (!sessionId) throw Error('請先開始營業。');
    const prepareSession = app.functions('asia-southeast1').httpsCallable('festivalPreparePhotoSessionV181', {timeout:20000});
    const {data} = await prepareSession({sessionId,quotaOnly});
    if (!data?.message) throw Error('尚未確認拍立得場次，請再試一次。');
    return data;
  }

  window.PhotoOpening = {prepare};
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('photoQuickOpen');
    const status = document.getElementById('photoQuickStatus');
    if (!button || !status) return;
    button.addEventListener('click', async () => {
      button.disabled = true;
      status.textContent = '正在讀取本場排班與拍攝輪次…';
      try {
        const app = window.FestivalDeskBridge?.app || firebase.app();
        status.textContent = (await prepare(app)).message;
      } catch (error) {
        status.textContent = error.message || '暫時無法開啟拍立得，請再試一次。';
      } finally {
        button.disabled = false;
      }
    });
  });
})();
