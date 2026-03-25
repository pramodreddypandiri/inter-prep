import json
import re


def extract_json(text: str):
    """Extract JSON from Claude responses that may contain markdown fences."""
    # Try direct parse first
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strip markdown code fences
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Try to find first { or [ and parse from there
    for i, ch in enumerate(text):
        if ch in "{[":
            try:
                return json.loads(text[i:])
            except json.JSONDecodeError:
                continue

    raise ValueError(f"Could not extract JSON from response: {text[:200]}")
