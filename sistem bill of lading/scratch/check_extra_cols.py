import zipfile
import xml.etree.ElementTree as ET
import re

xlsx_path = "PNK CONTAINER MOVEMENT - WGM 256T (1).xlsx"

def check_extra_cols(filename):
    with zipfile.ZipFile(filename, 'r') as z:
        wb_data = z.read('xl/workbook.xml')
        wb_root = ET.fromstring(wb_data)
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        sheets = []
        for sheet in wb_root.findall('.//ns:sheet', ns):
            name = sheet.attrib.get('name')
            sheet_id = sheet.attrib.get('sheetId')
            r_id = sheet.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
            sheets.append({'name': name, 'id': sheet_id, 'r_id': r_id})

        rels = {}
        if 'xl/_rels/workbook.xml.rels' in z.namelist():
            rels_data = z.read('xl/_rels/workbook.xml.rels')
            rels_root = ET.fromstring(rels_data)
            rel_ns = {'r': 'http://schemas.openxmlformats.org/package/2006/relationships'}
            for rel in rels_root.findall('.//r:Relationship', rel_ns):
                rels[rel.attrib.get('Id')] = rel.attrib.get('Target')

        for s in sheets:
            target = rels.get(s['r_id'])
            sheet_file = f"xl/{target}" if not target.startswith('xl/') else target
            sheet_data = z.read(sheet_file)
            sheet_root = ET.fromstring(sheet_data)
            
            all_cols = set()
            for row in sheet_root.findall('.//ns:row', ns):
                for cell in row.findall('ns:c', ns):
                    ref = cell.attrib.get('r')
                    col_letter = re.match(r'^([A-Z]+)', ref).group(1)
                    all_cols.add(col_letter)
            
            print(f"Sheet '{s['name']}' has columns: {sorted(list(all_cols), key=lambda x: (len(x), x))}")

check_extra_cols(xlsx_path)
