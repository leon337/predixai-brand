(() => {
  "use strict";
  const header=document.querySelector("[data-header]");
  const toggle=document.querySelector("[data-menu-toggle]");
  const menu=document.querySelector("[data-menu]");
  const year=document.querySelector("[data-year]");
  const reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const primaryOrigin="https://predixai-brand.vercel.app";
  const isGitHubPages=window.location.hostname.endsWith("github.io");
  if(year) year.textContent=String(new Date().getFullYear());
  if(isGitHubPages){document.querySelectorAll('a[href^="/"]').forEach(link=>{if(link instanceof HTMLAnchorElement) link.href=`${primaryOrigin}${link.getAttribute("href")}`;});}
  const updateHeader=()=>header?.classList.toggle("is-scrolled",window.scrollY>18);updateHeader();window.addEventListener("scroll",updateHeader,{passive:true});
  const closeMenu=()=>{menu?.classList.remove("is-open");toggle?.setAttribute("aria-expanded","false");};
  toggle?.addEventListener("click",()=>{const open=menu?.classList.toggle("is-open")??false;toggle.setAttribute("aria-expanded",String(open));});
  menu?.querySelectorAll("a").forEach(link=>link.addEventListener("click",closeMenu));window.addEventListener("keydown",event=>{if(event.key==="Escape"){closeMenu();toggle?.focus();}});
  const revealItems=document.querySelectorAll(".reveal");
  if(reduceMotion||!("IntersectionObserver" in window)){revealItems.forEach(item=>item.classList.add("is-visible"));}else{const observer=new IntersectionObserver((entries,current)=>{entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.classList.add("is-visible");current.unobserve(entry.target);});},{threshold:.12,rootMargin:"0px 0px -40px"});revealItems.forEach((item,index)=>{item.style.transitionDelay=`${Math.min(index%4,3)*70}ms`;observer.observe(item);});}
  if(reduceMotion)return;
  const canvas=document.getElementById("network-canvas");if(!(canvas instanceof HTMLCanvasElement))return;const context=canvas.getContext("2d");if(!context)return;
  let width=0,height=0,nodes=[],frameId=0;const pointer={x:-1000,y:-1000};
  const createNodes=()=>{const low=width<=680,divisor=low?43000:30000,maximum=low?34:56,minimum=low?18:24,count=Math.min(maximum,Math.max(minimum,Math.floor((width*height)/divisor)));nodes=Array.from({length:count},()=>({x:Math.random()*width,y:Math.random()*height,vx:(Math.random()-.5)*.16,vy:(Math.random()-.5)*.16,radius:Math.random()*1.2+.5}));};
  const resize=()=>{const ratio=Math.min(window.devicePixelRatio||1,1.75);width=window.innerWidth;height=window.innerHeight;canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;context.setTransform(ratio,0,0,ratio,0,0);createNodes();};
  const draw=()=>{context.clearRect(0,0,width,height);nodes.forEach((node,index)=>{node.x+=node.vx;node.y+=node.vy;if(node.x< -20)node.x=width+20;if(node.x>width+20)node.x=-20;if(node.y< -20)node.y=height+20;if(node.y>height+20)node.y=-20;const pd=Math.hypot(node.x-pointer.x,node.y-pointer.y);if(pd<130){const force=(130-pd)/1300;node.x+=(node.x-pointer.x)*force;node.y+=(node.y-pointer.y)*force;}context.beginPath();context.arc(node.x,node.y,node.radius,0,Math.PI*2);context.fillStyle="rgba(101,241,216,.44)";context.fill();for(let next=index+1;next<nodes.length;next+=1){const other=nodes[next],distance=Math.hypot(node.x-other.x,node.y-other.y);if(distance>125)continue;context.beginPath();context.moveTo(node.x,node.y);context.lineTo(other.x,other.y);context.strokeStyle=`rgba(93,168,255,${.12*(1-distance/125)})`;context.lineWidth=.7;context.stroke();}});frameId=window.requestAnimationFrame(draw);};
  window.addEventListener("resize",resize,{passive:true});window.addEventListener("pointermove",event=>{pointer.x=event.clientX;pointer.y=event.clientY;},{passive:true});document.addEventListener("visibilitychange",()=>{if(document.hidden)window.cancelAnimationFrame(frameId);else frameId=window.requestAnimationFrame(draw);});resize();draw();
})();
