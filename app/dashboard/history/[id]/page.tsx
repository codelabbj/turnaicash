import ClientTransactionDetailPage from "./client-page"

export function generateStaticParams() {
  // In a static export for a mobile app, we return an empty array 
  // to tell Next.js that the paths will be handled at runtime/client-side.
  return []
}

export default function Page() {
  return <ClientTransactionDetailPage />
}
