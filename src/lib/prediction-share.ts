import type { KnockoutFixture } from "./matches";
import { predictionVerdict } from "./prediction-verdict";
import type { KnockoutResult, Submission } from "./prode";

function escape(value: string) {
  return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function lines(value: string, limit: number) {
  const output: string[] = [];
  let line = "";
  for (const word of value.split(/\s+/)) {
    for (let i=0;i<word.length;i+=limit) {
      const part=word.slice(i,i+limit);
      if (line && line.length+part.length+1>limit) { output.push(line); line=""; }
      line += (line?" ":"")+part;
    }
  }
  if(line) output.push(line);
  return output.length?output:["—"];
}
export function buildPredictionShareSvg(fixture: KnockoutFixture, participants: Pick<Submission,"name"|"knockoutPredictions">[], isPublic: boolean, result?: KnockoutResult) {
  const text=(value:string,x:number,y:number,size=23,weight=600,fill="#101b2b")=>`<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${escape(value)}</text>`;
  let y=290;
  const rowSvg=participants.map((participant,index)=>{
    const prediction=isPublic?participant.knockoutPredictions.find(p=>p.fixtureId===fixture.id):undefined;
    const values=[participant.name,isPublic?(prediction?`${prediction.homeGoals} - ${prediction.awayGoals}`:"Sin pronóstico"):"Privado",isPublic&&prediction?.qualifiedTeam?(prediction.qualifiedTeam==="home"?fixture.home:fixture.away):"—",isPublic?prediction?.goalScorer||"—":"—"];
    const columns=values.map((value,i)=>lines(value,[22,12,17,17][i]));
    const height=Math.max(...columns.map(c=>c.length))*28+28;
    const verdict=isPublic?predictionVerdict(fixture,prediction,result):"pending";
    const fill=verdict==="exact"?"#d6f3df":verdict==="result"?"#fff0b8":verdict==="miss"?"#ffe0df":index%2?"#edf2f5":"#fffdf7";
    const row=`<rect x="24" y="${y}" width="1032" height="${height}" fill="${fill}"/>${columns.map((column,i)=>column.map((line,j)=>text(line,[40,405,575,820][i],y+32+j*28,i===0?22:23,i===1?800:600)).join("")).join("")}`;
    y+=height;return row;
  }).join("");
  const height=y+(result?125:65);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}" viewBox="0 0 1080 ${height}"><rect width="1080" height="${height}" fill="#fffdf7"/><rect width="1080" height="205" fill="#101b2b"/>${text("Copa Se mató Pavón · Pronósticos",40,54,36,900,"#fffdf7")}${lines(`${fixture.home} vs. ${fixture.away}`,49).map((line,i)=>text(line,40,110+i*40,32,800,"#fffdf7")).join("")}${text(fixture.id.endsWith("-vuelta")?"Vuelta":fixture.id.endsWith("-ida")?"Ida":"Partido único",40,185,23,600,"#fffdf7")}${["Participante","Marcador","Clasificado","Goleador"].map((label,i)=>text(label,[40,405,575,820][i],265,24,800)).join("")}${rowSvg}${result?text(`Resultado oficial: ${result.homeGoals}–${result.awayGoals} · Verde: exacto · Amarillo: resultado/clasificado`,40,height-82,19)+text("Rojo: sin aciertos · El goleador no influye en el color.",40,height-54,19):""}${text(isPublic?"Pronósticos públicos · Se respeta el filtro de participantes seleccionado.":"Pronósticos privados hasta el cierre de edición del partido.",40,height-24,20)}</svg>`;
}

export async function predictionImageFile(svg: string, filename: string) {
  const source=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml;charset=utf-8"}));
  try {
    const img=new Image();
    const loaded=new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error("No se pudo generar la imagen."));});
    img.src=source;await loaded;
    const canvas=document.createElement("canvas");canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
    const context=canvas.getContext("2d");if(!context)throw new Error("No se pudo preparar la imagen.");
    context.drawImage(img,0,0);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(new Error("No se pudo guardar la imagen.")),"image/png"));
    return new File([blob],filename,{type:"image/png"});
  } finally {URL.revokeObjectURL(source);}
}
