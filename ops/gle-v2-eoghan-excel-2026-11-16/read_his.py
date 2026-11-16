# Reads sheet 1 (Bileog1) of Eoghan's xlsx into JSON rows. Run with python3 -I, from outside the upload folder.
import zipfile,re,sys,json
from xml.etree import ElementTree as ET
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
z=zipfile.ZipFile(sys.argv[1]); ss=[]
if 'xl/sharedStrings.xml' in z.namelist():
    for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',ns): ss.append(''.join(t.text or '' for t in si.iter('{%s}t'%ns['m'])))
ws=ET.fromstring(z.read('xl/worksheets/sheet1.xml')); rows=[]
for r in ws.find('m:sheetData',ns):
    d={}
    for c in r:
        ref=c.get('r'); col=re.match(r'[A-Z]+',ref).group(); t=c.get('t'); v=c.find('m:v',ns)
        if t=='s': val=ss[int(v.text)]
        elif t=='inlineStr': val=''.join(x.text or '' for x in c.iter('{%s}t'%ns['m']))
        else: val=v.text if v is not None else ''
        d[col]=val
    rows.append({'r':int(r.get('r')),**d})
json.dump(rows,open(sys.argv[2],'w'),ensure_ascii=False,indent=0)
print(len(rows))
