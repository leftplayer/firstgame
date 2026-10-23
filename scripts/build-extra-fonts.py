# Regenerate additional test fonts: pip install fonttools brotli
import urllib.request,urllib.parse,re,base64,concurrent.futures,json,io,zipfile
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
root=Path(__file__).resolve().parents[1]; dest=root/'web/fonts'
articles=json.loads((root/'assets/resources/articles.json').read_text())
zh=''.join(sorted(set(''.join(a['text'] for a in articles if a['language']=='zh')+'正在打字风穿过窗边每一个字都有自己的节奏中文黑体宋体楷体字体测试加载中失败重试标题正文成绩')))
en=''.join(chr(x) for x in range(32,127))
def fetch(u):
 for n in range(3):
  try:return urllib.request.urlopen(u,timeout=45).read()
  except Exception:
   if n==2:raise
items=[('zh-chiron','Chiron Hei HK',True),('zh-round','Chiron GoRound TC',True),('zh-butter','ZCOOL QingKe HuangYou',False),('en-vt323','VT323',False),('en-plex','IBM Plex Mono',True),('en-tech','Share Tech Mono',False),('en-cutive','Cutive Mono',False),('en-courier','Courier Prime',True),('en-pixelify','Pixelify Sans',True),('en-press','Press Start 2P',False),('zh-ma','Ma Shan Zheng',False),('zh-liu','Liu Jian Mao Cao',False),('zh-xiaowei','ZCOOL XiaoWei',False)]
def google(item):
 key,family,bold=item
 u='https://fonts.googleapis.com/css2?'+urllib.parse.urlencode({'family':family+(':wght@400;700' if bold else ''),'text':zh if key.startswith('zh') else en,'display':'swap'})
 css=fetch(u).decode()
 for url in set(re.findall(r'url\((.*?)\)',css)):css=css.replace(url,'data:font/ttf;base64,'+base64.b64encode(fetch(url)).decode())
 (dest/(key+'.css')).write_text(css)
 (dest/(family.lower().replace(' ','')+'-LICENSE.txt')).write_bytes(fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/'+family.lower().replace(' ','')+'/OFL.txt'))
 print(key,len(css),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as p:list(p.map(google,items))
def custom(key,family,data):
 f=TTFont(io.BytesIO(data)); missing=set(map(ord,zh))-set(f.getBestCmap());print(key,'missing', ''.join(map(chr,missing)),flush=True)
 options=subset.Options();options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*'];s=subset.Subsetter(options);s.populate(text=zh);s.subset(f)
 for rec in f['name'].names:
  if rec.nameID in [1,3,4,6,16,17]:
   val='Regular' if rec.nameID==17 else family.replace(' ','') if rec.nameID==6 else family
   rec.string=val.encode(rec.getEncoding())
 f.flavor='woff2';b=io.BytesIO();f.save(b)
 (dest/(key+'.css')).write_text('@font-face{font-family:"'+family+'";font-style:normal;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,'+base64.b64encode(b.getvalue()).decode()+') format("woff2")}')
custom('zh-bitmap','NowTyping Bitmap',fetch('https://raw.githubusercontent.com/scott0107000/BoutiqueBitmap9x9/main/BoutiqueBitmap9x9_1.93.ttf'))
(dest/'bitmap-LICENSE.txt').write_bytes(fetch('https://raw.githubusercontent.com/scott0107000/BoutiqueBitmap9x9/main/OFL.txt'))
z=zipfile.ZipFile(io.BytesIO(fetch('https://github.com/TakWolf/fusion-pixel-font/releases/download/2026.10.16/fusion-pixel-font-12px-monospaced-otf.woff2-v2026.10.16.zip')))
print(z.namelist(),flush=True)
n=next(n for n in z.namelist() if 'zh_hans' in n and n.endswith('.woff2'))
custom('zh-fusion','NowTyping Fusion',z.read(n))
(dest/'fusion-LICENSE.txt').write_bytes(b'\n\n'.join((n+'\n').encode()+z.read(n) for n in z.namelist() if n.endswith('.txt')))

base='https://raw.githubusercontent.com/fontsource/font-files/main/fonts/other/win95fa/'
css=fetch(base+'index.css').decode()
for url in set(re.findall(r'url\((.*?)\)',css)):
 data=fetch(urllib.parse.urljoin(base,url.strip("'\"")))
 mime='woff2' if url.endswith('woff2') else 'woff'
 css=css.replace(url,'data:font/'+mime+';base64,'+base64.b64encode(data).decode())
(dest/'en-w95.css').write_text(css.replace('WIN95FA','W95FA'))
(dest/'w95-LICENSE.txt').write_bytes(fetch(base+'LICENSE'))
