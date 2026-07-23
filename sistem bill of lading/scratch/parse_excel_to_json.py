import zipfile
import xml.etree.ElementTree as ET
import re
import os
import json

xlsx_path = "PNK CONTAINER MOVEMENT - WGM 256T (1).xlsx"
output_json_path = "scratch/movement_data.json"

def excel_val_to_str(val):
    if val is None:
        return ""
    return str(val).strip()

def parse_xlsx_to_json():
    if not os.path.exists(xlsx_path):
        print(f"File not found: {xlsx_path}")
        return

    result_data = []

    with zipfile.ZipFile(xlsx_path, 'r') as z:
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

            # Parse metadata
            voyage_name = s['name']
            voyage_date = ""
            if 4 in rows:
                date_val = rows[4].get('C', '')
                if date_val:
                    # Let's see if date_val is a float date serial
                    try:
                        date_serial = float(date_val)
                        if date_serial > 40000 and date_serial < 50000:
                            # Convert to date string
                            import datetime
                            dt = datetime.datetime(1899, 12, 30) + datetime.timedelta(days=date_serial)
                            voyage_date = dt.strftime('%d/%m/%Y')
                        else:
                            voyage_date = str(date_val)
                    except ValueError:
                        voyage_date = str(date_val)

            # Parse container rows
            containers = []
            col_mapping = {
                'B': 'port', 'C': 'pol', 'D': 'mlo', 'E': 'size', 'F': 'cntr_num', 
                'G': 'shipper_in', 'H': 'consignee_in', 'I': 'bl_number', 'J': 'status_in', 
                'K': 'vessel_in', 'L': 'loaded_in', 'M': 'discharge', 'N': 'gate_out', 
                'O': 'depot_in', 'P': 'depot', 'Q': 'condition', 'R': 'depot_out', 
                'S': 'gate_in_cy', 'T': 'shipper_out', 'U': 'consignee_out', 
                'V': 'status_out', 'W': 'vessel_out', 'X': 'loaded_out', 'Y': 'pod'
            }

            for idx in sorted(rows.keys()):
                if idx <= 5: # skip titles and header
                    continue
                
                row_data = rows[idx]
                # Check if row has container number
                cntr_num = row_data.get('F', '').strip()
                if not cntr_num:
                    continue
                
                c_data = {}
                for col_let, field_name in col_mapping.items():
                    val = row_data.get(col_let, '')
                    
                    # Convert dates serial if found in date fields
                    if col_let in ['L', 'M', 'N', 'O', 'P', 'R', 'S', 'X'] and val:
                        try:
                            val_float = float(val)
                            if val_float > 40000 and val_float < 50000:
                                import datetime
                                dt = datetime.datetime(1899, 12, 30) + datetime.timedelta(days=val_float)
                                val = dt.strftime('%d/%m/%Y')
                        except ValueError:
                            pass
                            
                    c_data[field_name] = excel_val_to_str(val)
                    
                containers.append(c_data)
                
            result_data.append({
                'voyage_name': voyage_name,
                'voyage_date': voyage_date,
                'containers': containers
            })
            print(f"Parsed voyage '{voyage_name}' (date='{voyage_date}') with {len(containers)} rows.")

    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(result_data, f, ensure_ascii=False, indent=2)
    print(f"Saved parsed data to: {output_json_path}")

parse_xlsx_to_json()
