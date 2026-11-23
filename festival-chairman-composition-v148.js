(() => {
  'use strict';
  const defaults = {fit:'cover', x:50, y:29, zoom:1, rotate:0};

  function paint(img, composition) {
    img.style.objectFit = composition.fit;
    img.style.objectPosition = composition.x + '% ' + composition.y + '%';
    img.style.transformOrigin = composition.x + '% ' + composition.y + '%';
    img.style.transform = 'scale(' + composition.zoom + ') rotate(' + composition.rotate + 'deg)';
  }

  function make(tag, text) {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    return element;
  }

  function mount({host, source, composition, onChange, safePhoto}) {
    let current = {...defaults, ...composition};
    const fieldset = make('fieldset');
    fieldset.className = 'chairman-composition-editor';
    fieldset.append(make('legend', '夏目美雪・照片構圖'));
    const image = make('img');
    image.alt = '照片構圖即時預覽';
    const frame = make('div');
    frame.className = 'chairman-composition-frame';
    const placeholder = make('span', '請先上傳照片或填寫照片網址');
    frame.append(image, placeholder);
    const view = make('select');
    const modes = [['wide','邀請函'], ['rules','活動規則彈窗'], ['profile','完整自介']];
    for (const [value, text] of modes) {
      const option = make('option', text);
      option.value = value;
      view.append(option);
    }
    const preview = make('label', '預覽位置');
    preview.append(view);
    view.onchange = () => { frame.dataset.view = view.value; };
    fieldset.append(preview, frame);

    const controls = [];
    function addControl(key, text, input, format) {
      const label = make('label', text);
      const value = make('output');
      label.append(input, value);
      input.addEventListener('input', () => {
        current[key] = input.type === 'range' ? input.valueAsNumber : input.value;
        repaint();
        onChange({...current});
      });
      fieldset.append(label);
      controls.push({key,input,value,format});
    }
    const fit = make('select');
    for (const [value, text] of [['cover','填滿畫框'],['contain','完整顯示']]) {
      const option = make('option', text);
      option.value = value;
      fit.append(option);
    }
    addControl('fit', '顯示方式', fit, () => '');
    for (const [key, text, min, max, step, format] of [
      ['x','左右焦點',0,100,1,n=>n+'%'],
      ['y','上下焦點',0,100,1,n=>n+'%'],
      ['zoom','放大',1,2.5,.05,n=>Math.round(n*100)+'%'],
      ['rotate','旋轉',-30,30,1,n=>n+'°']
    ]) {
      const slider = make('input');
      Object.assign(slider,{type:'range',min,max,step});
      addControl(key,text,slider,format);
    }
    const reset = make('button', '重設構圖');
    reset.type = 'button';
    reset.onclick = () => {
      current = {...defaults};
      repaint();
      onChange(null);
    };
    fieldset.append(reset);
    function repaint() {
      for (const {key,input,value,format} of controls) {
        input.value = current[key];
        value.textContent = format(current[key]);
      }
      const url = safePhoto(source.value);
      image.hidden = !url;
      placeholder.hidden = Boolean(url);
      if (url && image.getAttribute('src') !== url) image.src = url;
      if (!url) image.removeAttribute('src');
      paint(image, view.value==='profile' && !changed ? {...current,fit:'contain'} : current);
    }
    let changed = Boolean(composition);
    fieldset.addEventListener('input', event => {
      if(event.target===view)return;
      changed = true;
      repaint();
    });
    reset.addEventListener('click',()=>{changed=false;repaint();});
    view.addEventListener('change', repaint);
    source.addEventListener('input', repaint);
    host.append(fieldset);
    repaint();
  }

  function applyPublic(raw) {
    const composition = window.FestivalPageSchema?.normalizeChairmanComposition(raw);
    if (!composition) return;
    for (const selector of ['.chairman-card .chairman-photo img','#rules-dialog .entry-photo-column img','#chairman-profile .profile-photo-reserved img']) {
      const image = document.querySelector(selector);
      if (!image || image.hidden) continue;
      const parent = image.parentElement;
      if (parent.matches('figure')) {
        const frame = make('div');
        frame.className = 'chairman-rules-frame-v148';
        image.before(frame);
        frame.append(image);
      } else if (parent.classList.contains('profile-photo-reserved')) {
        parent.classList.add('chairman-profile-frame-v148');
      }
      paint(image, composition);
    }
  }

  window.FestivalChairmanComposition = {mount, applyPublic};
})();
