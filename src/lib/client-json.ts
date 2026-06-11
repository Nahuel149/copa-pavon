export async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const error = !text.trim()
    ? `El servidor respondio vacio (${response.status}). Intenta nuevamente.`
    : `El servidor devolvio una respuesta invalida (${response.status}). Intenta nuevamente.`;

  try {
    return JSON.parse(text) as T;
  } catch {
    return {
      error,
      errors: [error],
      submissions: [],
      fixtures: [],
      standings: [],
      standingsByClan: { "river-plate": [], "la-batata": [] },
      matchResults: [],
      groupResults: [],
      knockoutFixtures: [],
      knockoutResults: [],
      results: null,
      report: null,
      updatedAt: "",
    } as T;
  }
}
