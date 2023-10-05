export interface Api_Storage {
  domain?: string;
  token?: string;
}

export interface Course {
  id: string;
  name?: string;
  workflow_state?: string;
  created_at?: string;
}

export interface AssignmentGroup {
  id: string;
  name?: string;
  assignments: Assignment[];
}

export interface Assignment {
  id: string;
  name?: string;
  due_at: string | null;
  lock_at?: string;
  points_possible?: number;
  description: string;
  html_url?: string;
  has_submitted_submissions?: boolean;
  graded_submissions_exist?: boolean;
  submission?: Submission;
  locked_for_user?: boolean;
}

export interface Submission {
  id: string;
  grade: string;
  late: boolean;
  missing: boolean;
  late_policy_status?: string;
  workflow_state?: string;
}

export enum ItemType {
  PAGE = 'Page',
  QUIZ = "Quiz",
  ASSIGNMENT = "Assignment",
  SUBHEADER = "SubHeader",
  FILE = "File",
  DISCUSSION = "Discussion",
  EXTERNALURL = "ExternalUrl",
  EXTERNALTOOL = "ExternalTool"
}

// https://temecula.instructure.com
// 17153~mduoi9TFzd0exI5lPdcUmmhdGkPw8GoisoQ6Oak1RdQ7602gzSX8FuTlxV6jaUxV

export const getAuthToken = () => chrome.storage.local.get(["key"]);

export const getApiInfo = async () => {
  try {
    const { key: { domain, token }} = await getAuthToken();
    return { api: `${domain}/api/v1`, headers: { "Authorization": `Bearer ${token}` }}
  } catch(e: any) {
    throw Error(e.message);
  }
}

const fetchMiddleware = async (resp: any) => {
  if (!resp.ok) {
    throw Error(resp.status);
  }
  try {
    const json = await resp.json();
    if(json?.status) {
      throw Error(json.status);
    } else {
      return json;
    }
  } catch(e) {
    throw Error("NOT JSON");
  }
};

export const getCourses = async (): Promise<Course[]> => {
  const {api, headers} = await getApiInfo();
  return fetch(`${api}/courses?enrollment_state=active`, { mode: "cors", headers }).then(fetchMiddleware);
};

export const getAssignmentGroups = async (id: string): Promise<AssignmentGroup[]> => {
  const {api, headers} = await getApiInfo();
  return fetch(`${api}/courses/${id}/assignment_groups?include[]=assignments&include[]=submission`, { mode: "cors", headers }).then(fetchMiddleware);
}
