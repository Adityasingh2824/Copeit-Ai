import assert from 'node:assert/strict';
import test from 'node:test';
const retrieve=(xs,min=.72)=>{const ok=xs.filter(x=>x.approved&&x.score>=min);return ok.length?{answer:ok[0].content,citations:ok.map(x=>({version:x.version,page:x.page,score:x.score}))}:{answer:'Insufficient approved evidence to answer this question.',citations:[]}};
test('grounded answer includes immutable version and page citation',()=>{const r=retrieve([{approved:true,score:.86,content:'Keep the declaration with the technical documentation.',version:'EU-source-v1',page:12}]);assert.match(r.answer,/declaration/);assert.deepEqual(r.citations,[{version:'EU-source-v1',page:12,score:.86}])});
test('unapproved and weak evidence causes abstention',()=>{const r=retrieve([{approved:false,score:.93,content:'draft'},{approved:true,score:.51,content:'weak'}]);assert.equal(r.answer,'Insufficient approved evidence to answer this question.');assert.deepEqual(r.citations,[])});
