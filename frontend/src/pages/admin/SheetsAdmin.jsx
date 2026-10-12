import ContentAdmin from "./ContentAdmin";

export default function SheetsAdmin({ modules }) {
  return <ContentAdmin modules={modules} kind="sheets" label="Fiches de révision" singularLabel="Fiche" />;
}
