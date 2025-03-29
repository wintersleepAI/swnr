
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
    input.classList.add("field", "resource-content", "flex", "flexrow");
    let count = 0;
    for (const [key, value] of Object.entries(field.fields)) {
      // let subInput = document.createElement("space");
      // subInput.innerHTML = key;
      const val = inputConfig.value[key];
      let subInput = value.toInput({ value: val, localize: _groupConfig.localize });
      subInput.classList.add("nested-field", "header");
      if (readOnly == count) {
        subInput.setAttribute("readonly", true);
        subInput.classList.add("readonly");
      }
      input.appendChild(subInput);
      if (count < fieldCount-1) {
        input.appendChild(spanSep.cloneNode(true));
      }
      count++;
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


/** 
 * Generate the HTML for group input elements.
 * Only works for fields and derived /prepared data elements cannot be used.
 * invoked like  {{formGroup systemFields.ab value=system.ab localize=true widget=groupWidget readonly=0}} 
 * readonly is optional sets what attribute should be set to readonly
 * for nested fields, the readonly attribute is to the index of the field in the nested fields object
 * for non-nested, 0 means the field is readonly 
 */
export function groupFieldWidget(field, _groupConfig, inputConfig) {
  const fg = document.createElement("div");
  fg.classList.add("form-group");

  const label = document.createElement("label");
  // label.classList.add("resource-label");
  label.innerHTML = field.label;
  fg.appendChild(label);

  const inputDiv = document.createElement("div");
  inputDiv.classList.add("form-fields");

  const readOnly = inputConfig.readonly != null ? inputConfig.readonly : -1;
  let input = null;
  if (field.fields) {
    const spanSep = document.createElement("span");
    spanSep.classList.add("nested-sep");
    spanSep.innerHTML = "/";
    const fieldCount = Object.keys(field.fields).length;
    input = document.createElement("div");
    input.classList.add("field", "flex","flexrow");
    let count = 0;
    for (const [key, value] of Object.entries(field.fields)) {
      // let subInput = document.createElement("space");
      // subInput.innerHTML = key;
      const val = inputConfig.value[key];
      let subInput = value.toInput({ value: val });
      subInput.classList.add("sub-field");
      if (readOnly == count) {
        subInput.setAttribute("readonly", true);
        subInput.classList.add("readonly");
      }
      input.appendChild(subInput);
      if (count < fieldCount-1) {
        input.appendChild(spanSep.cloneNode(true));
      }
      count++;
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


  return fg;
}


/** 
 * Generate the HTML for group input elements.
 * Only works for fields and derived /prepared data elements cannot be used.
 * invoked like  {{formGroup systemFields.ab value=system.ab localize=true widget=groupWidget readonly=0}} 
 * readonly is optional sets what attribute should be set to readonly
 * for nested fields, the readonly attribute is to the index of the field in the nested fields object
 * for non-nested, 0 means the field is readonly 
 */
export function checkboxFieldWidget(field, _groupConfig, inputConfig) {
  const fg = document.createElement("div");
  fg.classList.add("check-group");

  const label = document.createElement("label");
  label.innerHTML = field.label;
  fg.appendChild(label);
  const input = field.toInput({ value: inputConfig.value });
  fg.appendChild(input);
  return fg;
}

/** 
 * Generate the HTML for group input elements with no name fields for 
 * purely derived groups or duplicates.
 * Only works for fields and derived /prepared data elements cannot be used.
 * invoked like  {{formGroup systemFields.ab value=system.ab localize=true widget=groupWidgetDupe}} 
 */
export function groupFieldWidgetDupe(field, _groupConfig, inputConfig) {
  const fg = document.createElement("div");
  fg.classList.add("form-group");

  const label = document.createElement("label");
  // label.classList.add("resource-label");
  label.innerHTML = field.label;
  fg.appendChild(label);

  const inputDiv = document.createElement("div");
  inputDiv.classList.add("form-fields");

  let input = null;
  if (field.fields) {
    const spanSep = document.createElement("span");
    spanSep.classList.add("nested-sep");
    spanSep.innerHTML = "/";
    const fieldCount = Object.keys(field.fields).length;
    input = document.createElement("div");
    input.classList.add("field", "flex","flexrow");
    let count = 0;
    for (const [key, value] of Object.entries(field.fields)) {
      // let subInput = document.createElement("space");
      // subInput.innerHTML = key;
      const val = inputConfig.value[key];
      let subInput = value.toInput({ value: val });
      subInput.classList.add("sub-field");
      subInput.setAttribute("readonly", true);
      subInput.classList.add("readonly");
      subInput.removeAttribute("name");
      input.appendChild(subInput);
      if (count < fieldCount-1) {
        input.appendChild(spanSep.cloneNode(true));
      }
      count++;
    }
  } else {
    input = field.toInput({ value: inputConfig.value });
    input.setAttribute("readonly", true);
    input.classList.add("readonly");
    input.removeAttribute("name");
  }

  if (input == null) {
    input = document.createElement("span");
    input.innerHTML = "error hlp";
  }
  inputDiv.appendChild(input);
  fg.appendChild(inputDiv);


  return fg;
}

export function registerHandlebarHelpers() {

  Handlebars.registerHelper("debug", function () {
    return JSON.stringify(this, null, 2);
  });
  Handlebars.registerHelper("stringify", function (obj) {
    return JSON.stringify(obj, null, 2);
  });

  Handlebars.registerHelper("trim", function (obj, n) {
    if (!obj) return "";
    if (obj.length <= n) return obj;
    return obj.substring(0, n) + "...";
  });

  Handlebars.registerHelper("wouldTrim", function (obj, n) {
    if (!obj) return false;
    if (obj.length <= n) return false;
    return true;
  });

  Handlebars.registerHelper("firstLetter", function (obj) {
    if (!obj) return "";
    return obj.substring(0, 1).toUpperCase();
  });


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Handlebars.registerHelper("halfway", (array, index) => {
    if (Math.ceil(array.length / 2) === index) {
      return true;
    }
    return false;
  });

  Handlebars.registerHelper("mod2", (index) => {
    return index % 2 == 0;
  });

  Handlebars.registerHelper("mod2Offset", (index, offset) => {
    return (index + offset) % 2 == 0;
  });

  Handlebars.registerHelper('times', function (n, block) {
    var accum = '';
    for (var i = 0; i < n; ++i)
      accum += block.fn(i);
    return accum;
  });

  Handlebars.registerHelper(
    "getPCStatModForWeapon",
    (
      actor,
      weapon,
      forDamage = false
    ) => {
      const skillID = weapon.system.skill;
      let skillItem = actor.getEmbeddedDocument("Item", skillID);
      if (!skillItem || skillItem.type !== "skill") {
        skillItem = undefined;
      }
      //console.log({ skillID, skillItem });
      const skillBonus =
        forDamage && weapon.system.skillBoostsDamage
          ? skillItem?.system.rank ?? -1
          : 0;
      const untrainedPenalty = skillBonus === -1 ? -1 : 0;
      const stats = actor.system.stats;
      const statsToCheck = [stats[weapon.system.stat].mod];
      if (weapon.system.secondStat !== "none")
        statsToCheck.push(stats[weapon.system.secondStat]?.mod || 0);
      return Math.max(...statsToCheck) + skillBonus + untrainedPenalty;
    }
  );

  Handlebars.registerHelper('transformDicePool', function(pool) {
    const poolMap = {
      "2D6": "2d6",
      "3D6": "3d6kh2",
      "4D6": "4d6kh2"
    };
    return poolMap[pool] || pool;
  });

  Handlebars.registerHelper('getStatChoices', function(stats) {
    const statChoices = {};
    Object.keys(stats).forEach(key => {
      const stat = stats[key];
      const localizedLabel = game.i18n.localize("swnr.stat.long." + key );
      statChoices[key] = `${localizedLabel} +${stat.mod}`; // Format the string 
    });
    return statChoices;
  });
  
  Handlebars.registerHelper('getSkillChoices', function(skills, noSkillSetAsOption = false){
    const skillChoices = {};
    if(noSkillSetAsOption == true)
    {
      skillChoices[""] = game.i18n.localize("swnr.weapon.noSetSkill");
    }
    Object.keys(skills).forEach(key => {
      const skill = skills[key];
      skillChoices[skill.id] = `${skill.name} ${skill.system.rank}`; 
    });
    return skillChoices;
  });
  
  Handlebars.registerHelper('getAssetCategoryKey', function (category) {
    return Object.keys(CONFIG.SWN.assetCategories)
        .find(key => CONFIG.SWN.assetCategories[key] === category);
  })
}
