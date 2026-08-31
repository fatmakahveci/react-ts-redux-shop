import AppShell from "./components/AppShell";
import { connection } from "next/server";

export default async function HomePage(): Promise<React.ReactElement> {
	await connection();
	return <AppShell />;
}
