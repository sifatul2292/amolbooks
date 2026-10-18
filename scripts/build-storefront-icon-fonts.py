from pathlib import Path
import re,json,hashlib,sys
from fontTools import subset
from fontTools.ttLib import TTFont
r=Path(__file__).resolve().parents[1]
if len(sys.argv) != 4: raise SystemExit('Usage: build-storefront-icon-fonts.py solid.ttf brands.ttf font-awesome.css')
files=list((r/'ui/dist/angular-ui/browser').glob('*.js'))+list((r/'gtm-snippets').glob('*.html'))+list((r/'api/src').glob('storefront-*.ts'))
classes=set()
for p in files: classes.update(re.findall(r'\bfa-([a-z0-9-]+)',p.read_text(errors='replace')))
classes.update('facebook facebook-f youtube whatsapp instagram twitter linkedin linkedin-in pinterest telegram tiktok google'.split())
css=Path(sys.argv[3]).read_text()
points=set()
for selectors,code in re.findall(r'([^{}]+)\{content:"\\([a-f0-9]+)"\}',css):
 names=set(re.findall(r'\.fa-([a-z0-9-]+):',selectors))
 if names & classes: points.add(int(code,16))
assert 10 < len(points) < 200
result={}
for kind,source in [('solid',sys.argv[1]),('brands',sys.argv[2])]:
 font=TTFont(source); available=points & set(font.getBestCmap())
 options=subset.Options();options.flavor='woff2';options.name_IDs=['*'];options.name_legacy=True;options.recalc_timestamp=False
 font.recalcTimestamp=False
 font.flavor='woff2'
 sub=subset.Subsetter(options=options);sub.populate(unicodes=available);sub.subset(font)
 temp=Path('/tmp/amol-'+kind+'-subset.woff2');font.save(temp)
 data=temp.read_bytes();name='font-awesome-6-'+kind+'.'+hashlib.sha256(data).hexdigest()[:12]+'.woff2'
 (r/'gtm-snippets/assets'/name).write_bytes(data)
 check=TTFont(temp);assert available<=set(check.getBestCmap())
 result[kind]={'file':name,'bytes':len(data),'originalBytes':Path(source).stat().st_size,'unicodeRange':','.join('U+'+format(p,'X') for p in sorted(available))}
 print(kind,result[kind])
(r/'gtm-snippets/assets/icon-fonts.json').write_text(json.dumps(result,indent=2))
