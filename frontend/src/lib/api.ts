const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Request failed");
  }

  return res.json();
}

export const api = {
  // Sessions
  createSession: (data: {
    name: string;
    company_name: string;
    jd_text: string;
    resume_text: string;
    round_description: string;
    user_id: string;
  }) => fetchAPI("/api/sessions", { method: "POST", body: JSON.stringify(data) }),

  getSessions: (userId: string) =>
    fetchAPI(`/api/sessions?user_id=${userId}`),

  getSession: (sessionId: string) =>
    fetchAPI(`/api/sessions/${sessionId}`),

  deleteSession: (sessionId: string) =>
    fetchAPI(`/api/sessions/${sessionId}`, { method: "DELETE" }),

  // Prep Sources
  generatePrepSources: (sessionId: string) =>
    fetchAPI(`/api/sessions/${sessionId}/prep-sources`, { method: "POST" }),

  getPrepSources: (sessionId: string) =>
    fetchAPI(`/api/sessions/${sessionId}/prep-sources`),

  regeneratePrepSection: (sessionId: string, section: string) =>
    fetchAPI(`/api/sessions/${sessionId}/prep-sources/section`, {
      method: "POST",
      body: JSON.stringify({ section }),
    }),

  // Resume upload
  uploadResume: async (file: File, userId: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", userId);

    const res = await fetch(`${API_URL}/api/upload-resume`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(error.detail || "Upload failed");
    }

    return res.json();
  },

  // Quiz Sessions
  createQuiz: (sessionId: string, data: { topics: string; num_questions?: number }) =>
    fetchAPI(`/api/sessions/${sessionId}/quiz`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  submitQuiz: (sessionId: string, quizId: string, answers: { question_id: number; answer: string; selected_option?: number }[]) =>
    fetchAPI(`/api/sessions/${sessionId}/quiz/${quizId}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),

  listQuizzes: (sessionId: string) =>
    fetchAPI(`/api/sessions/${sessionId}/quiz`),

  getQuiz: (sessionId: string, quizId: string) =>
    fetchAPI(`/api/sessions/${sessionId}/quiz/${quizId}`),

  // Mock Interviews
  createMockInterview: (sessionId: string, data: { topics: string; duration: number; difficulty: string }) =>
    fetchAPI(`/api/sessions/${sessionId}/mock-interview`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  sendMockMessage: (sessionId: string, mockId: string, content: string) =>
    fetchAPI(`/api/sessions/${sessionId}/mock-interview/${mockId}/message`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  endMockInterview: (sessionId: string, mockId: string, eyeTracking?: { totalLookAways: number; readingPatterns: number; suspiciousEvents: unknown[] }) =>
    fetchAPI(`/api/sessions/${sessionId}/mock-interview/${mockId}/end`, {
      method: "POST",
      body: JSON.stringify({ eye_tracking: eyeTracking || null }),
    }),

  listMockInterviews: (sessionId: string) =>
    fetchAPI(`/api/sessions/${sessionId}/mock-interview`),

  getMockInterview: (sessionId: string, mockId: string) =>
    fetchAPI(`/api/sessions/${sessionId}/mock-interview/${mockId}`),
};
