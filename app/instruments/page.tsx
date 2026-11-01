// this is for testing the customers data from the database to fetch the data from the database
// server side rendering

import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

async function CustomersData() {
  const supabase = await createClient();
  const { data: billings } = await supabase.from("billings").select();

  return <pre>{JSON.stringify(billings, null, 2)}</pre>;
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div>Loading customers...</div>}>
      <CustomersData />
    </Suspense>
  );
}