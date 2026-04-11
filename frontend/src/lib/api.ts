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

  updateSession: (
    sessionId: string,
    data: Partial<{
      name: string;
      company_name: string;
      jd_text: string;
      resume_text: string;
      round_description: string;
    }>
  ) =>
    fetchAPI(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

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

  // Elevator Pitch
  generatePitch: (data: {
    target_role: string;
    company_name?: string;
    resume_text?: string;
    key_strengths?: string;
  }) =>
    fetchAPI("/api/elevator-pitch/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createPitch: (data: {
    pitch_text: string;
    target_role: string;
    company_name?: string;
    resume_text?: string;
  }) =>
    fetchAPI("/api/elevator-pitch", {
      method: "POST",
      body: JSON.stringify({ company_name: "", resume_text: "", ...data }),
    }),

  listPitches: () => fetchAPI("/api/elevator-pitch"),

  getPitch: (pitchId: string) => fetchAPI(`/api/elevator-pitch/${pitchId}`),

  updatePitch: (pitchId: string, data: { pitch_text: string; target_role?: string; company_name?: string }) =>
    fetchAPI(`/api/elevator-pitch/${pitchId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deletePitch: (pitchId: string) =>
    fetchAPI(`/api/elevator-pitch/${pitchId}`, { method: "DELETE" }),

  createRecording: async (
    pitchId: string,
    data: { transcript: string; duration_seconds: number; video?: Blob }
  ) => {
    const authHeaders = await (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");
      return { Authorization: `Bearer ${session.access_token}` };
    })();

    const formData = new FormData();
    formData.append("transcript", data.transcript);
    formData.append("duration_seconds", String(data.duration_seconds));
    if (data.video) {
      formData.append("video", data.video, "recording.webm");
    }

    const res = await fetch(`${API_URL}/api/elevator-pitch/${pitchId}/recordings`, {
      method: "POST",
      headers: authHeaders,
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(error.detail || "Request failed");
    }
    return res.json();
  },

  listRecordings: (pitchId: string) =>
    fetchAPI(`/api/elevator-pitch/${pitchId}/recordings`),

  getSharedRecording: (token: string) =>
    fetch(`${API_URL}/api/elevator-pitch/share/${token}`).then((r) => {
      if (!r.ok) throw new Error("Recording not found");
      return r.json();
    }),

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
