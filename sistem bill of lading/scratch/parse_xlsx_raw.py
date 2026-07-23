import zipfile
import xml.etree.ElementTree as ET
import re
import os

xlsx_path = "PNK CONTAINER MOVEMENT - WGM 256T (1).xlsx"

def parse_xlsx(filename):
    if not os.path.exists(filename):
        print(f"File not found: {filename}")
        return

    with zipfile.ZipFile(filename, 'r') as z:
        # 1. Read shared strings
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            ss_data = z.read('xl/sharedStrings.xml')
            root = ET.fromstring(ss_data)
            ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            for si in root.findall('ns:si', ns):
                t_elements = si.findall('.//ns:t', ns)
                text = "".join([t.text for t in t_elements if t.text])
                shared_strings.append(text)
        else:
            print("No shared strings found.")

        # 2. Read workbook
        wb_data = z.read('xl/workbook.xml')
        wb_root = ET.fromstring(wb_data)
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        sheets = []
        for sheet in wb_root.findall('.//ns:sheet', ns):
            name = sheet.attrib.get('name')
            sheet_id = sheet.attrib.get('sheetId')
            r_id = sheet.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
            sheets.append({'name': name, 'id': sheet_id, 'r_id': r_id})
            
        print("Sheets found:")
        for idx, s in enumerate(sheets):
            print(f"  {idx}: Name='{s['name']}', ID='{s['id']}', r_id='{s['r_id']}'")

        rels = {}
        if 'xl/_rels/workbook.xml.rels' in z.namelist():
            rels_data = z.read('xl/_rels/workbook.xml.rels')
            rels_root = ET.fromstring(rels_data)
            rel_ns = {'r': 'http://schemas.openxmlformats.org/package/2006/relationships'}
            for rel in rels_root.findall('.//r:Relationship', rel_ns):
                r_id = rel.attrib.get('Id')
                target = rel.attrib.get('Target')
                rels[r_id] = target

        for s in sheets:
            print(f"\n--- Data in Sheet '{s['name']}' ---")
            target = rels.get(s['r_id'])
            if not target:
                sheet_file = f"xl/worksheets/sheet{s['id']}.xml"
            else:
                if target.startswith('/xl/'):
                    sheet_file = target[1:]
                elif target.startswith('xl/'):
                    sheet_file = target
                else:
                    sheet_file = f"xl/{target}"

            if sheet_file not in z.namelist():
                print(f"Sheet file {sheet_file} not found in zip.")
                continue

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

            sorted_row_indices = sorted(rows.keys())
            print(f"Total rows found: {len(sorted_row_indices)}")
            
            # Print rows 1 to 6 completely to see column names
            for r_idx in range(1, min(7, len(sorted_row_indices) + 1)):
                if r_idx in rows:
                    r_data = rows[r_idx]
                    col_keys = sorted(r_data.keys(), key=lambda x: (len(x), x))
                    cols_str = ", ".join([f"{col}: '{r_data[col]}'" for col in col_keys if r_data[col]])
                    print(f"Row {r_idx}: {cols_str}")

            # Let's print row 5's columns and their types/values
            if 5 in rows:
                print("Row 5 Columns:")
                row_5 = rows[5]
                col_keys = sorted(row_5.keys(), key=lambda x: (len(x), x))
                for col in col_keys:
                    print(f"  {col}: {repr(row_5[col])}")

            # Also check if there are other rows or what is row 4
            if 4 in rows:
                print("Row 4:")
                print(rows[4])

parse_xlsx(xlsx_path)
