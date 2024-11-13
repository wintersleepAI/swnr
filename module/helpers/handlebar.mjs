

export function headerFieldWidget(field, _groupConfig, inputConfig) {
    const fg = document.createElement("div");
    fg.classList.add("resource", "flex-group-center");

    const inputDiv = document.createElement("div");
    inputDiv.classList.add("resource", "header", "flexrow");
    
    
    let input = null;
    if (field.fields) {
        const spanSep = document.createElement("span");
        spanSep.classList.add("nested-sep");
        spanSep.innerHTML = "/";
        const fieldCount = Object.keys(field.fields).length;
        input = document.createElement("div");
        input.classList.add("field", "resource-content");
        for (const [key, value] of Object.entries(field.fields)) {
            // let subInput = document.createElement("space");
            // subInput.innerHTML = key;
            let subInput = value.toInput({ value: inputConfig[key] });
            subInput.classList.add("nested-field", "header");
            input.appendChild(subInput);
            input.appendChild(spanSep.cloneNode(true));
        }
    } else {
        input = field.toInput({ value: inputConfig.value });
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


export function headerFieldValMaxWidget(field, _groupConfig, inputConfig) {
    console.log("headerFieldValMaxWidget");
    console.log(field);
    console.log(_groupConfig);
    console.log(inputConfig);
    // let val = field.fields.value.toInput();
    // let max = field.fields.max.toInput();

    // console.log(val.outerHTML + " " + max.outerHTML);
    //console.log(field.toInput());
    // let x = foundry.applications.fields.createFormGroup(field, _groupConfig, inputConfig);
    // console.log(typeof x);
    // console.log(x);

    //return val.outerHTML + " \ " + max.outerHTML; 

    const fg = document.createElement("div");
    // fg.appendChild(val);
    // fg.appendChild(max);

    // fg.className = "resource flex-group-center";
    // fg.innerHTML = `field: ${field}`;
    return fg;
}