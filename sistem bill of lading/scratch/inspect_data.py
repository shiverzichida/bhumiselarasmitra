import zipfile
import xml.etree.ElementTree as ET
import re
import os

xlsx_path = "PNK CONTAINER MOVEMENT - WGM 256T (1).xlsx"

def parse_xlsx(filename):
    with zipfile.ZipFile(filename, 'r') as z:
        # Read shared strings
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            ss_data = z.read('xl/sharedStrings.xml')
            root = ET.fromstring(ss_data)
            ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            for si in root.findall('ns:si', ns):
                t_elements = si.findall('.//ns:t', ns)
                text = "".join([t.text for t in t_elements if t.text])
                shared_strings.append(text)

        # Read workbook
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
            print(f"\n================ SHEET: {s['name']} ================")
            target = rels.get(s['r_id'])
            sheet_file = f"xl/{target}" if not target.startswith('xl/') else target
            sheet_data = z.read(sheet_file)
            sheet_root = ET.fromstring(sheet_data)
            
            rows = {}
            for row in sheet_root.findall('.//ns:row', ns):
                row_idx = int(row.attrib.get('r'))
                row_data = {}
                for cell in row.findall('ns:c', ns):
                    ref = cell.attrib.get('r')
                    col_letter = re.match(r'^([A-Z]+)', ref).group(1)
                    val_el = cell.find('ns:v', ns)
                    t_attr = cell.attrib.get('t')
                    
                    if val_el is not None:
                        val = val_el.text
                        if t_attr == 's':
                            val = shared_strings[int(val)]
                        row_data[col_letter] = val
                    else:
                        row_data[col_letter] = ""
                rows[row_idx] = row_data

            # Let's count unique values of Column K (Vessel 1) and Column W (Vessel 2)
            vessels_k = {}
            vessels_w = {}
            total_data_rows = 0
            for idx in sorted(rows.keys()):
                if idx < 6: # header and metadata rows
                    continue
                row_data = rows[idx]
                k_val = row_data.get('K', '')
                w_val = row_data.get('W', '')
                if k_val:
                    vessels_k[k_val] = vessels_k.get(k_val, 0) + 1
                if w_val:
                    vessels_w[w_val] = vessels_w.get(w_val, 0) + 1
                total_data_rows += 1

            print(f"Total data rows (row > 5): {total_data_rows}")
            print(f"Unique values in Col K (Vessel In):")
            for k, count in vessels_k.items():
                print(f"  - '{k}': {count} rows")
            print(f"Unique values in Col W (Vessel Out):")
            for w, count in vessels_w.items():
                print(f"  - '{w}': {count} rows")

parse_xlsx(xlsx_path)
