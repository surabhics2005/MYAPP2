async function shareCardImage(el){
const canvas=await html2canvas(el,{backgroundColor:null,scale:2});
const blob=await new Promise(r=>canvas.toBlob(r,"image/jpeg",0.95));
const file=new File([blob],"mycard.jpg",{type:"image/jpeg"});

if(navigator.canShare&&navigator.canShare({files:[file]}))
 navigator.share({files:[file],title:"MYCARD"});
else{
 const a=document.createElement("a");
 a.href=URL.createObjectURL(blob);
 a.download="mycard.jpg";
 a.click();
}
}
