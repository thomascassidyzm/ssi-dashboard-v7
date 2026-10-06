'use strict';
// fra_for_eng job #329 — PASS=followup: corrections to the sweep's own rows, found by re-running the checks after it.
module.exports = {
  // K33: S0327L01 teaches "to offer | proposer" and seed 327 says "offer"; the sweep's re-gloss used "propose"
  S0327L01B02: { from: ["do you think it's useful to propose?", 'penses-tu que c\'est utile de proposer ?'], to: ["do you think it's useful to offer?", 'penses-tu que c\'est utile de proposer ?'], rule: 'K33', why: 'follow the LEGO gloss "to offer | proposer" (seed 327 says offer)' },
  S0327L02U06: { from: ["do you think it's important to propose another way?", 'penses-tu que c\'est important de proposer un autre moyen ?'], to: ["do you think it's important to offer another way?", 'penses-tu que c\'est important de proposer un autre moyen ?'], rule: 'K33', why: 'follow the LEGO gloss "to offer | proposer" (seed 327 says offer)' },
};
