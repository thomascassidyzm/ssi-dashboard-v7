# How to Start Fine-Tuning (Generation 1)

**Time Required:** 5 minutes to start, 2-4 hours for API to complete

---

## Prerequisites

1. Anthropic API key with fine-tuning access
2. Training files ready:
   - `skills/lego-extraction-skill/training/anthropic-format/training.jsonl` (641 KB)
   - `skills/lego-extraction-skill/training/anthropic-format/validation.jsonl` (71 KB)

---

## Option A: Using Anthropic Console (Easiest)

### Step 1: Go to Anthropic Console
Visit: https://console.anthropic.com/settings/fine-tuning

### Step 2: Upload Training Data
1. Click "Create Fine-Tuning Job"
2. Upload `training.jsonl`
3. Upload `validation.jsonl` (optional but recommended)

### Step 3: Configure Job
- **Base Model:** `claude-sonnet-4-5`
- **Job Name:** `ssi-lego-extraction-v1`
- **Description:** "Generation 1: LEGO extraction with FD + FCFS corrections"

### Step 4: Start Training
- Click "Start Fine-Tuning"
- Note the job ID
- Monitor progress in console

### Step 5: Wait for Completion
- Training typically takes 2-4 hours
- You'll get email notification when complete
- Fine-tuned model ID will be available

---

## Option B: Using Anthropic CLI (If you have it)

```bash
# Install CLI if needed
pip install anthropic-cli

# Set API key
export ANTHROPIC_API_KEY="your-api-key-here"

# Upload training data
anthropic fine-tuning create-dataset \
  --training-data skills/lego-extraction-skill/training/anthropic-format/training.jsonl \
  --validation-data skills/lego-extraction-skill/training/anthropic-format/validation.jsonl \
  --name "ssi-lego-gen1-dataset"

# Note the dataset ID from output, then:

# Create fine-tuning job
anthropic fine-tuning create-job \
  --dataset-id <dataset-id-from-above> \
  --base-model claude-sonnet-4-5 \
  --suffix "ssi-lego-v1"

# Monitor status
anthropic fine-tuning get-job --job-id <job-id>
```

---

## Option C: Using Python API

```python
import anthropic
import os

client = anthropic.Anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY")
)

# Upload training data
with open("skills/lego-extraction-skill/training/anthropic-format/training.jsonl", "rb") as f:
    training_data = f.read()

with open("skills/lego-extraction-skill/training/anthropic-format/validation.jsonl", "rb") as f:
    validation_data = f.read()

# Create fine-tuning job
job = client.fine_tuning.create(
    training_data=training_data,
    validation_data=validation_data,
    base_model="claude-sonnet-4-5",
    suffix="ssi-lego-v1"
)

print(f"Job ID: {job.id}")
print(f"Status: {job.status}")

# Monitor progress
import time
while True:
    job = client.fine_tuning.get(job.id)
    print(f"Status: {job.status}")
    if job.status in ["succeeded", "failed", "cancelled"]:
        break
    time.sleep(60)  # Check every minute

if job.status == "succeeded":
    print(f"Fine-tuned model: {job.fine_tuned_model}")
```

---

## What to Expect

### Training Progress
1. **Uploading data** (~1-2 min)
2. **Validating format** (~1-2 min)
3. **Training** (~1-3 hours)
4. **Evaluation** (~5-10 min)
5. **Deployment** (~5-10 min)

### Success Indicators
- Status: "succeeded"
- Fine-tuned model ID provided (e.g., `claude-sonnet-4-5:ssi-lego-v1:abc123`)
- Validation loss decreased
- No errors in logs

### If It Fails
Common issues:
- **Format error:** Check JSONL format (each line is valid JSON)
- **Data too small:** We have 453 examples (should be enough)
- **API limits:** Check account fine-tuning quota

---

## Save the Model ID

Once complete, save the fine-tuned model ID:

```bash
# Create file with model ID
echo "claude-sonnet-4-5:ssi-lego-v1:YOUR_MODEL_ID_HERE" > \
  skills/lego-extraction-skill/testing/generation-1-model-id.txt
```

---

## While You Wait

I'm building the A/B testing framework so we can immediately test when fine-tuning completes!

The test will:
1. Run same 4 courses through Gen 1 model
2. Compare outputs to Gen 0 baseline
3. Measure quality improvement
4. Prove self-healing worked

---

## Timeline

| Step | Duration |
|------|----------|
| Upload data | 1-2 min |
| Start job | 1 min |
| **Training (API)** | **2-4 hours** |
| Ready to test | Immediate |

**Total:** ~2-4 hours (mostly waiting)

---

Let me know when you've kicked it off, and I'll have the testing framework ready! 🚀
