import csv

NAME='Name / Template'
NEW_TYPE ='New Type';
ATTR = 'Attribute';
SUB = 'Sub'
COMMENT = 'wsAI Comments'

HEADER = 'static defineSchema() {';

def print_class(current, attributes):
    print(f'export default class {current} extends foundry.abstract.TypeDataModel {{')
    print(f'  {HEADER}')
    for attr in attributes:
        if attr[1]:
            if type(attr[1]) == list:
                print(f'    schema.{attr[0]} = new fields.SchemaField({{')
                for x in attr[1]:
                    print(f'      {x[0]}: {x[1]},')
                print(f'    }});')    
            else:
                print(f'    schema.{attr[0]} = {attr[1]};')
        else:
            print(f'    schema.{attr[0]} = SWNShared.requiredString("");')
    print('  });')
    print('}')

    print('\n\n')
    print(f"<div class='grid grid-4col'> <!-- {current}-->")
    for attr in attributes:
        if attr[1] and type(attr[1]) == list:
            name = f'systemFields.{attr[0]}.fields.'
            print('  <div class="resource-group">')
            for x in attr[1]:
                print('    <div class="resource">')
                print(f'      {{{{formGroup {name}{x[0]} value=system.{attr[0]}.{x[0]} localize=true}}}}')
                print('    </div>')
            print('  </div><!-- end resource-group -->')

        else:
            print('  <div class="resource">')
            print(f'   {{{{formGroup systemFields.{attr[0]} value=system.{attr[0]} localize=true}}}}')
            print('  </div>')
    print(f'</div><!-- end grid-col {current} -->\n')

def run():
    current = None
    in_schema = None
    schema_name = None
    attributes = []
    with open('data.csv', 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            if row[NAME]:
                if current != None:
                    print_class(current, attributes)
                    attributes = []
                    in_schema = None
                current = row[NAME]
                #print(f'## {current}')
            elif current is not None:
                if row[ATTR]:
                    if row[NEW_TYPE]:
                        # End of old schema field
                        if in_schema is not None:
                            attributes.append((schema_name, in_schema))
                            in_schema = None
                            schema_name = None

                        #create schema field
                        if 'SchemaField' in row[NEW_TYPE]:
                            in_schema = []
                            schema_name = row[ATTR]
                        else:
                            attributes.append((row[ATTR], row[NEW_TYPE]))
                    else:
                        attributes.append((row[ATTR], None))
                elif row[SUB]:
                    if in_schema is None:
                        #print(f'Error: Sub without SchemaField: {row}')
                        pass
                    else: 
                        in_schema.append((row[SUB], row[NEW_TYPE]))
    if current is not None:
        if in_schema is not None:
            attributes.append((schema_name, in_schema))
        print_class(current, attributes)
        current = None
if __name__ == '__main__':
    run()
