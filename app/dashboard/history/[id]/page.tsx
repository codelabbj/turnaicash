import ClientTransactionDetailPage from "./client-page"

export function generateStaticParams() {
  // Static export requires at least one entry. The actual transaction ID is
  // read at runtime from the URL on the client, so this placeholder is never used.
  return [{ id: "placeholder" }]
}

export default function Page() {
  return <ClientTransactionDetailPage />
}
