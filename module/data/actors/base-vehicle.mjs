import SWNShared from '../shared.mjs';

export default class SWNVehicleBase extends foundry.abstract
  .TypeDataModel {
  static LOCALIZATION_PREFIXES = ["SWN.Actor.base"];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};
    /*
    TODO
    export default class type SWNRMechClass = "suit" | "light" | "heavy"; extends foundry.abstract.TypeDataModel {
      static defineSchema() {
      });
    }

    export default class type SWNRShipClass = "fighter" | "frigate" | "cruiser" | "capital"; extends foundry.abstract.TypeDataModel {
      static defineSchema() {
      });
    }


    export default class type SWNRVehicleClass = "s" | "m" | "l"; extends foundry.abstract.TypeDataModel {
      static defineSchema() {
      });
    }


export default class SWNRResource  extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    schema.name = SWNShared.requiredString("");
    schema.value = SWNShared.requiredString("");
    schema.max = SWNShared.requiredString("");
  });
}
  <div class='grid grid-4col'> <!-- SWNRResource -->
  <div class="resource">
   {{formGroup systemFields.name value=system.name localize=true}}
  </div>
  <div class="resource">
   {{formGroup systemFields.value value=system.value localize=true}}
  </div>
  <div class="resource">
   {{formGroup systemFields.max value=system.max localize=true}}
  </div>
</div><!-- end grid-col SWNRResource  -->

    */

    schema.health = SWNShared.resourceField(10, 10);
    schema.cost = SWNShared.requiredNumber(0);
    schema.ac = SWNShared.requiredNumber(10);
    schema.traumaTarget = SWNShared.requiredNumber(6);
    schema.armor = SWNShared.resourceField(1,1);
    schema.speed = SWNShared.requiredNumber(1);
    schema.crew = SWNShared.rangeResourceField(1,1,1);
    schema.crewMembers = new fields.ArrayField(new fields.DocumentIdField());
    schema.tl = SWNShared.requiredNumber(5);

    schema.description = new fields.HTMLField();
    schema.mods = SWNShared.requiredString(""); // TODO: HTML?

    schema.power = SWNShared.resourceField(1,1,true);
    schema.mass = SWNShared.resourceField(1,1,true);
    schema.hardpoints = SWNShared.resourceField(1,1,true);
    return schema;
  }

  prepareDerivedData() {
    this.health.percentage = Math.clamp((this.health.value * 100) / this.health.max, 0, 100);
    this.armor.percentage = Math.clamp((this.armor.value * 100) / this.armor.max, 0, 100);
  }
}
