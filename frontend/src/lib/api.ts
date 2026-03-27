import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  return { Authorization: `Bearer ${session.access_token}` };
}

async function fetchAPI(path: string, options: RequestInit = {}) {
  const authHeaders = await getAuthHeaders();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Request failed");
  }

  return res.json();
}

async function fetchFormData(path: string, formData: FormData) {
  const authHeaders = await getAuthHeaders();

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: authHeaders,
    body: formData,
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
  }) => fetchAPI("/api/sessions", { method: "POST", body: JSON.stringify(data) }),

  getSessions: () => fetchAPI("/api/sessions"),

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
  uploadResume: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchFormData("/api/upload-resume", formData);
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

  // Contact
  submitContact: async (data: {
    user_name: string;
    user_email: string;
    type: string;
    message: string;
    screenshot?: File;
  }) => {
    const formData = new FormData();
    formData.append("user_name", data.user_name);
    formData.append("user_email", data.user_email);
    formData.append("type", data.type);
    formData.append("message", data.message);
    if (data.screenshot) {
      formData.append("screenshot", data.screenshot);
    }
    return fetchFormData("/api/contact", formData);
  },
};
