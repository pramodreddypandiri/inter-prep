"""Unit tests for app.services.json_utils.extract_json."""

import pytest
from app.services.json_utils import extract_json


class TestExtractJsonDirect:
    """Test direct JSON parsing (no wrappers)."""

    def test_parse_plain_object(self):
        result = extract_json('{"key": "value"}')
        assert result == {"key": "value"}

    def test_parse_plain_array(self):
        result = extract_json('[1, 2, 3]')
        assert result == [1, 2, 3]

    def test_parse_with_whitespace(self):
        result = extract_json('  \n {"key": "value"}  \n ')
        assert result == {"key": "value"}

    def test_parse_nested_object(self):
        text = '{"a": {"b": [1, 2]}, "c": "d"}'
        result = extract_json(text)
        assert result["a"]["b"] == [1, 2]


class TestExtractJsonMarkdownFences:
    """Test extraction from markdown code fences (common Claude behavior)."""

    def test_json_fence(self):
        text = '```json\n{"key": "value"}\n```'
        result = extract_json(text)
        assert result == {"key": "value"}

    def test_plain_fence(self):
        text = '```\n{"key": "value"}\n```'
        result = extract_json(text)
        assert result == {"key": "value"}

    def test_fence_with_surrounding_text(self):
        text = 'Here is the JSON:\n```json\n{"key": "value"}\n```\nHope this helps!'
        result = extract_json(text)
        assert result == {"key": "value"}

    def test_fence_with_array(self):
        text = '```json\n[{"id": 1}, {"id": 2}]\n```'
        result = extract_json(text)
        assert len(result) == 2
        assert result[0]["id"] == 1

    def test_fence_with_whitespace_inside(self):
        text = '```json\n  \n{"key": "value"}\n  \n```'
        result = extract_json(text)
        assert result == {"key": "value"}


class TestExtractJsonFallback:
    """Test the brace-scanning fallback for malformed responses."""

    def test_text_before_json(self):
        text = 'Sure! Here is the result: {"key": "value"}'
        result = extract_json(text)
        assert result == {"key": "value"}

    def test_text_before_array(self):
        text = 'The questions are: [{"id": 1, "question": "What?"}]'
        result = extract_json(text)
        assert result == [{"id": 1, "question": "What?"}]

    def test_multiple_braces_picks_valid_one(self):
        # First brace starts invalid JSON, second starts valid
        text = '{ invalid } {"key": "value"}'
        result = extract_json(text)
        assert result == {"key": "value"}


class TestExtractJsonErrors:
    """Test error handling for unparseable content."""

    def test_no_json_raises_value_error(self):
        with pytest.raises(ValueError, match="Could not extract JSON"):
            extract_json("This is plain text with no JSON at all.")

    def test_empty_string_raises_value_error(self):
        with pytest.raises(ValueError, match="Could not extract JSON"):
            extract_json("")

    def test_only_whitespace_raises_value_error(self):
        with pytest.raises(ValueError, match="Could not extract JSON"):
            extract_json("   \n\t  ")

    def test_broken_json_raises_value_error(self):
        with pytest.raises(ValueError, match="Could not extract JSON"):
            extract_json('{"key": "value"')  # missing closing brace


class TestExtractJsonPrepSourcesContract:
    """Validate that extract_json can handle realistic Claude prep source responses."""

    def test_full_prep_sources_response(self):
        text = '''{
  "company_snapshot": "Google is a multinational tech company.",
  "interview_process": "5 rounds of interviews.",
  "technical_topics": "## Data Structures\\n- Arrays",
  "preparation_checklist": "1. Review system design",
  "resource_links": "- [Python Docs](https://docs.python.org)"
}'''
        result = extract_json(text)
        assert "company_snapshot" in result
        assert "interview_process" in result
        assert "technical_topics" in result
        assert "preparation_checklist" in result
        assert "resource_links" in result

    def test_prep_sources_in_fence(self):
        text = '''```json
{
  "company_snapshot": "test",
  "interview_process": "test",
  "technical_topics": "test",
  "preparation_checklist": "test",
  "resource_links": "test"
}
```'''
        result = extract_json(text)
        assert len(result) == 5


class TestExtractJsonQuizContract:
    """Validate quiz question and feedback JSON structures."""

    def test_quiz_questions_array(self):
        text = '[{"id": 1, "question": "What is REST?"}, {"id": 2, "question": "Explain HTTP methods."}]'
        result = extract_json(text)
        assert isinstance(result, list)
        assert len(result) == 2
        assert all("id" in q and "question" in q for q in result)

    def test_quiz_feedback_object(self):
        text = '''{
  "per_question": [{"question_id": 1, "feedback": "Good", "ideal_answer": "REST is...", "score": 8}],
  "overall_summary": "Strong understanding.",
  "strong_areas": ["REST"],
  "gaps": ["caching"],
  "topics_to_revisit": ["HATEOAS"]
}'''
        result = extract_json(text)
        assert "per_question" in result
        assert "overall_summary" in result
        assert isinstance(result["strong_areas"], list)
        assert isinstance(result["gaps"], list)
        assert isinstance(result["topics_to_revisit"], list)


class TestExtractJsonFeedbackContract:
    """Validate mock interview feedback report JSON structure."""

    def test_feedback_report_structure(self):
        text = '''{
  "answer_quality": "Solid technical answers.",
  "answer_structure": "Well-organized responses.",
  "communication": "Clear and concise.",
  "eye_tracking_notes": "Good eye contact.",
  "areas_to_improve": ["More examples", "Discuss trade-offs"],
  "overall_rating": "Strong",
  "question_by_question": [{"question": "System design?", "assessment": "Good overview", "score": 7}]
}'''
        result = extract_json(text)
        assert "answer_quality" in result
        assert "answer_structure" in result
        assert "communication" in result
        assert "eye_tracking_notes" in result
        assert isinstance(result["areas_to_improve"], list)
        assert "overall_rating" in result
        assert isinstance(result["question_by_question"], list)
        assert result["question_by_question"][0]["score"] == 7
