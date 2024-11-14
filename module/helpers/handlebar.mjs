
/** 
 * Generate the HTML for header input elements.
 * Only works for fields and derived /prepared data elements cannot be used.
 * invoked like  {{formGroup systemFields.ab value=system.ab localize=true widget=headerWidget readonly=0}} 
 * readonly is optional sets what attribute should be set to readonly
 * for nested fields, the readonly attribute is to the index of the field in the nested fields object
 * for non-nested, 0 means the field is readonly 
 */
export function headerFieldWidget(field, _groupConfig, inputConfig) {
    const fg = document.createElement("div");
    fg.classList.add("resource", "flex-group-center");

    const inputDiv = document.createElement("div");
    inputDiv.classList.add("resource", "header", "flexrow");
    
    
    const readOnly = inputConfig.readonly != null ? inputConfig.readonly : -1;
    let input = null;
    if (field.fields) {
        const spanSep = document.createElement("span");
        spanSep.classList.add("nested-sep");
        spanSep.innerHTML = "/";
        const fieldCount = Object.keys(field.fields).length;
        input = document.createElement("div");
        input.classList.add("field", "resource-content");
        let count = 0;
        for (const [key, value] of Object.entries(field.fields)) {
            // let subInput = document.createElement("space");
            // subInput.innerHTML = key;
            const val = inputConfig.value[key];
            let subInput = value.toInput({ value: val });
            subInput.classList.add("nested-field", "header");
            if (readOnly == count++) {
                subInput.setAttribute("readonly", true);
                subInput.classList.add("readonly");
            }
            input.appendChild(subInput);
            input.appendChild(spanSep.cloneNode(true));
        }
    } else {
        input = field.toInput({ value: inputConfig.value });
        if (readOnly == 0) {
            input.setAttribute("readonly", true);
            input.classList.add("readonly");
        }
    }

    if (input == null) {
        input = document.createElement("span");
        input.innerHTML = "error hlp";
    }
    inputDiv.appendChild(input);
    fg.appendChild(inputDiv);

    const label = document.createElement("label");
    label.classList.add("resource-label");
    label.innerHTML = field.label;
    fg.appendChild(label);
    return fg;
}

