import { ReactNode, useEffect, useState } from "react";
import clsx from "clsx";
import {groupBy, orderBy} from "lodash";
import { Button, TextInput, Spinner, FormControl, IconButton } from '@primer/react'
import { LockIcon, UnlockIcon, XCircleFillIcon, GearIcon } from '@primer/octicons-react';
import "./App.css"
import { getCourses, Course, getAssignmentGroups, Assignment, AssignmentGroup, getAuthToken, Api_Storage } from "./api";

const App = () => {
  const currentYear = new Date().getFullYear();
  const yearDate = new Date(currentYear, 0, 1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [assignmentGroups, setAssignmentGroups] = useState<{[key: string]: AssignmentGroup[]}>({});
  const todaysDate = new Date().setHours(0, 0, 0, 0);
  const tomorrowsDate = new Date(todaysDate + 86400000).setHours(0, 0, 0, 0);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState<Api_Storage>({});
  const [showAuth, setShowAuth] = useState<boolean>(false);

  const fetchKeys = async () => {
    const auth = await getAuthToken();
    setKey(auth.key);
  };

  useEffect(() => {
    const getInfo = async () => {
      try {
        setLoading(true);
        if(key) {
          const courses = await getCourses();
          if(courses?.length) {
            setCourses(courses);
            const promises = courses.map((course) => getAssignmentGroups(course.id));

            if(promises.length) {
              const groups = await Promise.all(promises);
              const assignGroups = groups.reduce((obj: { [id: string] : AssignmentGroup[]}, group, index) => {
                  obj[courses[index].id] = group;
                  return obj;
              }, {});
              setAssignmentGroups(assignGroups);
              setLoading(false);
            }
          }
        } else {
          throw Error("Not auth set");
        }
      } catch(e: any) {
        setShowAuth(true);
        setLoading(false);
      }
    }

    getInfo();
  }, [key]);

  useEffect(() => {
    fetchKeys();
  }, []);

  const makeAssignmentGroups = (id: string) => {
    let content: ReactNode = <div>No Assignment Groups</div>;
    if(assignmentGroups[id]?.length) {
      content = assignmentGroups[id].map((group) => {
        const { id: groupId, assignments, name } = group;
        if(!name) {
          return null;
        }

        return (
        <details className="assignment_group">
          <summary>{name} ({ groupId })</summary>
          {makeAssignments(assignments)}
        </details>
        );
      });
    }
    return (
      <div className="assignment_groups">
        {content}
      </div>
    )
  };

  const makeAssignments = (assignments: Assignment[]) => {
    let content: ReactNode = <div>No Assignments</div>;
    let activeAssignments = assignments;

    if(searchTerm && assignments?.length) {
      activeAssignments = assignments.filter((a => a.name && a.name.toLowerCase().includes(searchTerm)));
    }

    if(activeAssignments?.length) {
      const { unsubmitted = [], graded = [], submitted = [], pending_review = [] } = groupBy(activeAssignments, "submission.workflow_state");
      const orderAssignments = [...orderBy(unsubmitted, "due_at", "desc"), ...orderBy(pending_review, "due_at", "desc"), ...orderBy(submitted, "due_at", "desc"), ...orderBy(graded, "due_at", "desc")];
      content = orderAssignments.map((assignment) => {
        const { id, name, due_at, points_possible, submission, locked_for_user } = assignment;
        let additionalClasses: { due?: boolean, late?: boolean, old?: boolean, pending?: boolean, graded?: boolean } = {};
        const dueDate = due_at && new Date(due_at).setHours(0, 0, 0, 0);
        const graded = submission?.workflow_state === "graded";
        const submitted = submission?.workflow_state === "submitted";

        if(!dueDate) {
          additionalClasses.old = true;
        } else if((tomorrowsDate === dueDate || todaysDate === dueDate) && !submitted) {
          additionalClasses.due = true;
        } else if (todaysDate > dueDate && !submitted && !graded) {
          additionalClasses.late = true;
        } else if (submitted) {
          additionalClasses.pending = true;
        } else if(graded) {
          additionalClasses.graded = true;
        }

        if(!name) {
          return assignments?.length;
        }

        return (
        <details className={clsx("assignment", { ...additionalClasses })}>
          <summary>{name}({ id }) {locked_for_user ? <LockIcon size={16} /> : <UnlockIcon size={16}/>}</summary>
          <p>Due Date: {dueDate ? new Date(dueDate).toISOString().split('T')[0] : "None"}</p>
          {points_possible && !graded ? <p>Points: {points_possible}</p> : ""}
          {graded ? <p>Grade: {submission?.grade}/{points_possible}</p> : ""}
          {submission?.workflow_state && <p>{submission.workflow_state}</p>}
          {submission?.late && <p>Late</p>}
          {submission?.missing && <p>Missing</p>}
        </details>
        );
      });
    }
    return (
      <div className="assignments">
        {content}
      </div>
    )
  }

  const makeCourses = () => {
    return courses.map((course) => {
      const { id, name, created_at } = course;
      if(!id || !name || !created_at || yearDate > new Date(created_at)) {
        return null;
      }

      return (
        <details className="course">
          <summary>{name}({id})</summary>
            {makeAssignmentGroups(id)}
        </details>
      );
    });
  };

  const makeAuth = () => (
    <form className="settings-page" onSubmit={storageSubmit}>
      <FormControl>
        <FormControl.Label>Canvas Domain:</FormControl.Label>
        <TextInput placeholder="*.instructure.com" defaultValue={key?.domain}/>
      </FormControl>
      <FormControl>
        <FormControl.Label>Token:</FormControl.Label>
        <TextInput placeholder="token" defaultValue={key?.token}/>
      </FormControl>
      <Button type="submit">Submit</Button>
    </form>
  );

  const makeContent = () => {
    if(showAuth || !courses?.length) return null;
    return (
      <>
        <TextInput className="filterInput" type="search" placeholder="Filter assignments by term" onChange={(e) => {
          setSearchTerm(e.target.value);
        }}/>
        {makeCourses()}
      </>
    );
  };

  const storageSubmit = async (e: any) => {
    e.preventDefault();
    const domain = e.target[0].value;
    const token = e.target[1].value;
    const value = { domain, token };
    await chrome.storage.local.set({ key: value });
    setCourses([]);
    setAssignmentGroups({});
    setKey(value);
    console.log('[VALUE]', value);
    setShowAuth(false);
  };

  const makeKey = () => {
    if(showAuth) return null;

    return (
      <div className="legend">
        <ul>
          <li className="old">Old</li>
          <li className="graded">Graded</li>
          <li className="submitted">Submitted</li>
          <li className="due">Due</li>
          <li className="late">Late</li>
          <li className="future">Future</li>
        </ul>
      </div>
    )
  };

  return (
    <div className="courses">
      <h1>My Canvas</h1>
      {makeKey()}
      <IconButton aria-label="Settings" className={"settings"} onClick={() => setShowAuth(!showAuth)} icon={GearIcon} />
      {showAuth === true && makeAuth()}
      {loading && !showAuth ? <div className="loading"><Spinner size="medium"/></div> : makeContent()}
    </div>
  );
}

export default App;
