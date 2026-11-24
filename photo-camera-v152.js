/* Shared frame preview and saved composition for both photo editors. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.PhotoCameraV152=factory();
})(globalThis,function(){
  'use strict';
  const limit=(value,min,max)=>Math.min(max,Math.max(min,value));
  const state=new WeakMap();
  const overrides=['position','inset','left','top','width','height','min-width','min-height','max-width','max-height','object-fit','object-position','transform-origin','transform'];
  const margin=.12;

  function geometry(w,h,iw,ih,p){
    const angle=p.rotate*Math.PI/180;
    const c=Math.cos(angle),s=Math.sin(angle),a=Math.abs(c),b=Math.abs(s);
    const nx=(p.x-50)/50,ny=(p.y-50)/50;
    if(p.fit==='contain'){
      const rw=iw*a+ih*b,rh=iw*b+ih*a;
      const fill=1-margin*2+(.96-(1-margin*2))*(p.zoom-1)/1.5;
      const scale=Math.min(w/rw,h/rh)*fill;
      const rangeX=Math.max(0,(w-rw*scale)/2),rangeY=Math.max(0,(h-rh*scale)/2);
      return {width:iw*scale,height:ih*scale,x:nx*rangeX,y:ny*rangeY,rangeX,rangeY};
    }
    const rangeX=w*margin,rangeY=h*margin;
    const x=nx*rangeX,y=ny*rangeY;
    const u=Math.abs(c*x+s*y),v=Math.abs(-s*x+c*y);
    const scale=Math.max((w*a+h*b+2*u)/iw,(w*b+h*a+2*v)/ih)*p.zoom;
    return {width:iw*scale,height:ih*scale,x,y,rangeX,rangeY};
  }

  function render(img, p, frame=img.parentElement){
    if(p?.compositionVersion!==2||!frame)return false;
    let saved=state.get(img);
    if(saved?.frame!==frame){
      if(saved){
        saved.observer.disconnect();
        saved.frame.classList.remove('photo-camera-viewport');
        img.removeEventListener('load',saved.apply);
      }
      const apply=()=>{
        const {p,frame}=state.get(img)||{};
        if(!p||!frame||!img.naturalWidth||!frame.clientWidth||!frame.clientHeight)return;
        const result=geometry(frame.clientWidth,frame.clientHeight,img.naturalWidth,img.naturalHeight,p);
        const style=img.style;
        const css={
          position:'absolute',inset:'auto',left:'calc(50% + '+result.x+'px)',top:'calc(50% + '+result.y+'px)',
          width:result.width+'px',height:result.height+'px','min-width':'0','min-height':'0',
          'max-width':'none','max-height':'none','object-fit':'fill','object-position':'center',
          'transform-origin':'center',transform:'translate(-50%, -50%) rotate('+p.rotate+'deg)'
        };
        for(const [name,value] of Object.entries(css))style.setProperty(name,value,'important');
      };
      const observer=new ResizeObserver(apply);
      img.addEventListener('load',apply);
      observer.observe(frame);
      frame.classList.add('photo-camera-viewport');
      saved={apply,observer,frame};
    }
    saved.p={...p};
    state.set(img,saved);
    saved.apply();
    return true;
  }

  function clear(img){
    const saved=state.get(img);
    if(!saved)return;
    saved.observer.disconnect();
    saved.frame.classList.remove('photo-camera-viewport');
    img.removeEventListener('load',saved.apply);
    state.delete(img);
    for(const name of overrides)img.style.removeProperty(name);
  }

  function drag(frame, img, current, change){
    let start;
    frame.classList.add('photo-camera-edit');
    img.draggable=false;
    frame.addEventListener('pointerdown',event=>{
      if(event.button!==0||img.hidden||!img.naturalWidth)return;
      const p=current();
      const g=geometry(frame.clientWidth,frame.clientHeight,img.naturalWidth,img.naturalHeight,p);
      start={id:event.pointerId,x:event.clientX,y:event.clientY,p,g};
      frame.setPointerCapture(start.id);
    });
    frame.addEventListener('pointermove',event=>{
      if(!start||event.pointerId!==start.id)return;
      const {p,g}=start;
      const next=(axis,delta,range)=>range>0 ? limit(Math.round(p[axis]+delta*50/range),0,100) : p[axis];
      change(next('x',event.clientX-start.x,g.rangeX),next('y',event.clientY-start.y,g.rangeY));
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])frame.addEventListener(type,()=>{start=undefined;});
  }
  return {render,clear,drag,geometry};
});
