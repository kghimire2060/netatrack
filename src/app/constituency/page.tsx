import { redirect } from "next/navigation";

/** The list lives at the plural path; the singular is for one record. */
export default function ConstituencyIndexRedirect() {
  redirect("/constituencies");
}
