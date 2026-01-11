// Convert Phase 2 v8 hybrid format to API object format
const fs = require('fs');

const input = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/scripts/phase2_worker1_output.json', 'utf8'));

// Convert v8 hybrid format to API object format
const apiFormat = {
  course: input.course,
  seeds: input.seeds.map(seedArray => {
    const [seedId, seedPair, legosArray] = seedArray;

    // Convert LEGOs from array format to object format
    const legos = legosArray.map((legoArray, index) => {
      const [type, newFlag, legoTexts, componentsOrNull, ref] = legoArray;

      // Generate LEGO ID
      const legoIndex = index + 1;
      const legoId = `${seedId}L${String(legoIndex).padStart(2, '0')}`;

      // Base LEGO object
      const lego = {
        id: legoId,
        type: type,
        new: newFlag === 1,
        lego: {
          known: legoTexts.k,
          target: legoTexts.t
        }
      };

      // Add components for M-types
      if (type === 'M' && componentsOrNull) {
        lego.components = componentsOrNull;
      }

      // Add ref for reused LEGOs
      if (ref) {
        lego.ref = ref;
      }

      return lego;
    });

    return {
      seed_id: seedId,
      seed_pair: {
        known: seedPair.k,
        target: seedPair.t
      },
      legos: legos
    };
  })
};

// Write output
const outputPath = '/home/user/ssi-dashboard-v7/scripts/phase2_worker1_api_format.json';
fs.writeFileSync(outputPath, JSON.stringify(apiFormat, null, 2));

console.log(`✅ Converted to API format: ${outputPath}`);
console.log(`Seeds: ${apiFormat.seeds.length}`);
console.log(`Total LEGOs: ${apiFormat.seeds.reduce((sum, s) => sum + s.legos.length, 0)}`);
