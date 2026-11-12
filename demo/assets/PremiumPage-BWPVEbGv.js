import{o as e}from"./rolldown-runtime-BCiCTKAo.js";import{n as t,t as n}from"./jsx-runtime-DM4CtBjC.js";import{S as r,u as i}from"./index-Wzafnd6Q.js";var a=e(r(),1);function o(e){let t=e.replace(/€/g,` EUR`).replace(/ß/g,`ss`).normalize(`NFKD`).replace(/[\u0300-\u036f]/g,``).replace(/[^\x20-\x7E\n]/g,`?`).split(`
`).flatMap(e=>{if(!e)return[``];let t=[],n=e;for(;n.length>88;){let e=n.lastIndexOf(` `,88);e<1&&(e=88),t.push(n.slice(0,e)),n=n.slice(e).trimStart()}return t.push(n),t}),n=[];for(let e=0;e<t.length;e+=52)n.push(t.slice(e,e+52));n.length||n.push([]);let r=n.map((e,t)=>4+t*2),i=[`1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj`,`2 0 obj << /Type /Pages /Kids [`+r.map(e=>e+` 0 R`).join(` `)+`] /Count `+n.length+` >> endobj`,`3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`];n.forEach((e,t)=>{let n=r[t],a=n+1,o=`BT /F1 10 Tf 48 790 Td 14 TL
`+e.map(e=>`(`+e.replace(/\\/g,`\\\\`).replace(/\(/g,`\\(`).replace(/\)/g,`\\)`)+`) Tj T*`).join(`
`)+`
ET`;i.push(n+` 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents `+a+` 0 R >> endobj`,a+` 0 obj << /Length `+o.length+` >> stream
`+o+`
endstream endobj`)});let a=`%PDF-1.4
`,o=[0];for(let e of i)o.push(a.length),a+=e+`
`;let s=a.length;a+=`xref
0 `+(i.length+1)+`
0000000000 65535 f 
`;for(let e of o.slice(1))a+=String(e).padStart(10,`0`)+` 00000 n 
`;return a+=`trailer << /Size `+(i.length+1)+` /Root 1 0 R >>
startxref
`+s+`
%%EOF`,a}var s=n();function c({data:e,language:n,onUpdate:r}){let[c,l]=(0,a.useState)(!1);return(0,s.jsxs)(`section`,{className:`page-enter`,children:[(0,s.jsx)(i,{kicker:t(n,`premiumKicker`),title:t(n,`premiumTitle`),trailing:(0,s.jsx)(`span`,{className:`badge-demo`,children:t(n,`demoBadge`)})}),(0,s.jsxs)(`section`,{className:`surface settings-card`,children:[(0,s.jsx)(`p`,{children:t(n,`premiumDescription`)}),e.isPremium?(0,s.jsx)(`p`,{className:`notice notice-lime`,children:t(n,`premiumActive`)}):(0,s.jsx)(`button`,{className:`button button-primary`,type:`button`,onClick:()=>r({isPremium:!0}),children:t(n,`activatePremium`)}),e.isPremium&&(0,s.jsx)(`button`,{className:`button button-dark`,type:`button`,onClick:()=>{let r=new Date().getFullYear(),i=o([t(n,`reportTitle`)+` `+r,``,t(n,`reportNotice`),``,...e.jobs.map(t=>{let n=e.shifts.filter(e=>e.jobId===t.id&&e.date.startsWith(String(r))).reduce((e,n)=>e+n.hours*t.wage,0);return t.title+`: `+n.toFixed(2)+` EUR`})].join(`
`)),a=URL.createObjectURL(new Blob([i],{type:`application/pdf`})),s=document.createElement(`a`);s.href=a,s.download=`headroom-jahresbericht-`+r+`.pdf`,s.click(),URL.revokeObjectURL(a),l(!0)},children:t(n,`pdfReport`)}),c&&(0,s.jsx)(`p`,{role:`status`,className:`field-hint`,children:t(n,`pdfCreated`)})]}),e.isPremium&&(0,s.jsxs)(`section`,{className:`surface settings-card`,children:[(0,s.jsx)(`h2`,{children:t(n,`multiYearHistory`)}),Array.from(new Set(e.shifts.map(e=>e.date.slice(0,4)))).sort().map(r=>(0,s.jsxs)(`p`,{className:`data-row`,children:[(0,s.jsx)(`span`,{children:r}),(0,s.jsxs)(`strong`,{children:[e.shifts.filter(e=>e.date.startsWith(r)).length,` `,t(n,`shiftCount`)]})]},r))]})]})}export{c as PremiumPage};