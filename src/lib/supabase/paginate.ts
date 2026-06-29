// Supabase devuelve como mucho 1000 filas por query. Para cargas de toda una liga
// (con muchos participantes hay miles de predicciones) hay que paginar con .range(),
// o si no se truncan en silencio y los cálculos que dependen de TODAS las filas
// (cuadros de eliminatoria, evolución del ranking) salen mal para algunos usuarios.
export async function fetchAllRows<T>(
  makeQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await makeQuery(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}
