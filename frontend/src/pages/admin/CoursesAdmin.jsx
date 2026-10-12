import ContentAdmin from "./ContentAdmin";

export default function CoursesAdmin({ modules }) {
  return <ContentAdmin modules={modules} kind="courses" label="Cours" singularLabel="Cours" />;
}
