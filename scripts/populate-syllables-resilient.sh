#!/bin/bash

# Resilient syllable population - processes one course at a time
# Automatically restarts if killed

set -a
source .env
set +a

COURSES=(
  "eng_for_spa" "bre_for_eng" "cym_s_for_eng" "cym_n_for_eng"
  "spa_for_eng" "ita_for_eng" "nld_for_eng" "por_for_eng"
  "deu_for_eng" "ara_for_eng" "gle_for_eng" "kor_for_eng"
  "eng_for_fra" "eng_for_ara" "eng_for_zho" "eng_for_por"
  "eng_for_deu" "eng_for_jpn" "zho_for_eng" "bre_for_fra"
)

LOG="/tmp/syllable-population-resilient.log"

echo "=====================================================" | tee -a $LOG
echo "RESILIENT SYLLABLE POPULATION - $(date)" | tee -a $LOG
echo "=====================================================" | tee -a $LOG

for course in "${COURSES[@]}"; do
  echo "" | tee -a $LOG
  echo "Processing: $course" | tee -a $LOG

  node scripts/populate-syllable-counts-fast.cjs "$course" 2>&1 | tee -a $LOG

  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ]; then
    echo "✓ $course completed successfully" | tee -a $LOG
  else
    echo "✗ $course failed with exit code $EXIT_CODE - continuing..." | tee -a $LOG
  fi

  sleep 2
done

echo "" | tee -a $LOG
echo "=====================================================" | tee -a $LOG
echo "ALL COURSES PROCESSED - $(date)" | tee -a $LOG
echo "=====================================================" | tee -a $LOG
