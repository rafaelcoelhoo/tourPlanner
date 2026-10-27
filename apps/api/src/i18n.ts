export type Lang = "pt" | "en" | "es";

/** As mensagens de erro são escritas em português no código; aqui ficam as traduções. */
const TRANSLATIONS: Record<string, { en: string; es: string }> = {
  "Ocorrência não encontrada.": { en: "Occurrence not found.", es: "Ocurrencia no encontrada." },
  "Ocorrência marcada como NT. Reative-a antes de atribuir.": { en: "Occurrence is marked NT. Reactivate it before assigning.", es: "La ocurrencia está marcada como NT. Reactívala antes de asignar." },
  "Guia inválido ou de outra cidade.": { en: "Invalid guide or guide from another city.", es: "Guía no válido o de otra ciudad." },
  "Guia já atribuído a esta ocorrência.": { en: "Guide is already assigned to this occurrence.", es: "El guía ya está asignado a esta ocurrencia." },
  "A atribuição viola regras.": { en: "The assignment breaks rules.", es: "La asignación incumple reglas." },
  "Atribuição não encontrada.": { en: "Assignment not found.", es: "Asignación no encontrada." },
  "Data fora do mês.": { en: "Date outside the month.", es: "Fecha fuera del mes." },
  "Confirme primeiro a matriz de necessidades.": { en: "Confirm the needs matrix first.", es: "Confirma primero la matriz de necesidades." },
  "Mês já publicado. Despublique antes de gerar novamente.": { en: "Month already published. Unpublish before generating again.", es: "Mes ya publicado. Despublícalo antes de generar de nuevo." },
  "Sem dados do mês.": { en: "No data for this month.", es: "Sin datos del mes." },
  "Gere um rascunho antes de publicar.": { en: "Generate a draft before publishing.", es: "Genera un borrador antes de publicar." },
  "Cidade não encontrada.": { en: "City not found.", es: "Ciudad no encontrada." },
  "Já existe um utilizador com este email.": { en: "A user with this email already exists.", es: "Ya existe un usuario con este correo." },
  "Guia não encontrado.": { en: "Guide not found.", es: "Guía no encontrado." },
  "O guia ainda não ativou a conta.": { en: "The guide has not activated the account yet.", es: "El guía aún no ha activado la cuenta." },
  "O guia ainda não tem cidade.": { en: "The guide has no city yet.", es: "El guía aún no tiene ciudad." },
  "Tour de outra cidade.": { en: "Tour from another city.", es: "Tour de otra ciudad." },
  "A data final não pode ser anterior à inicial.": { en: "The end date cannot be before the start date.", es: "La fecha final no puede ser anterior a la inicial." },
  "Slot de outra cidade.": { en: "Slot from another city.", es: "Slot de otra ciudad." },
  "Email ou palavra-passe incorretos.": { en: "Incorrect email or password.", es: "Correo o contraseña incorrectos." },
  "Convite inválido ou expirado.": { en: "Invalid or expired invitation.", es: "Invitación no válida o caducada." },
  "Palavra-passe atual incorreta.": { en: "Current password is incorrect.", es: "La contraseña actual es incorrecta." },
  "A palavra-passe deve ter pelo menos 8 caracteres.": { en: "The password must be at least 8 characters long.", es: "La contraseña debe tener al menos 8 caracteres." },
  "Já existe uma cidade com este nome.": { en: "A city with this name already exists.", es: "Ya existe una ciudad con este nombre." },
  "Já existe um tour com este nome nesta cidade.": { en: "A tour with this name already exists in this city.", es: "Ya existe un tour con este nombre en esta ciudad." },
  "Já existe um slot com este tour, idioma e hora.": { en: "A slot with this tour, language and time already exists.", es: "Ya existe un slot con este tour, idioma y hora." },
  "Conflito ao guardar o slot (duplicado?).": { en: "Conflict while saving the slot (duplicate?).", es: "Conflicto al guardar el slot (¿duplicado?)." },
  "Sessão inválida.": { en: "Invalid session.", es: "Sesión no válida." },
  "Apenas o administrador.": { en: "Administrator only.", es: "Solo el administrador." },
  "Sem permissão.": { en: "Permission denied.", es: "Sin permiso." },
  "Selecione a sua cidade no perfil.": { en: "Select your city in your profile.", es: "Selecciona tu ciudad en tu perfil." },
  "Sem acesso a esta cidade.": { en: "No access to this city.", es: "Sin acceso a esta ciudad." },
  "Cidade em falta.": { en: "City is missing.", es: "Falta la ciudad." },
  "Demasiadas tentativas. Tente novamente mais tarde.": { en: "Too many attempts. Please try again later.", es: "Demasiados intentos. Inténtalo de nuevo más tarde." },
  "Link inválido ou expirado.": { en: "Invalid or expired link.", es: "Enlace no válido o caducado." },
  "O horário deste mês já foi publicado. Contacte o administrador para alterar disponibilidades.": {
    en: "This month's schedule is already published. Contact the administrator to change availability.",
    es: "El horario de este mes ya está publicado. Contacta con el administrador para cambiar disponibilidades.",
  },
  "Não encontrado.": { en: "Not found.", es: "No encontrado." },
  "Erro interno.": { en: "Internal error.", es: "Error interno." },
  "Dados inválidos.": { en: "Invalid data.", es: "Datos no válidos." },
};

export const parseLang = (h: unknown): Lang => (h === "en" || h === "es" ? h : "pt");

export const translate = (message: string, lang: Lang): string => (lang === "pt" ? message : TRANSLATIONS[message]?.[lang] ?? message);

export const isKnownMessage = (message: string): boolean => message in TRANSLATIONS;
