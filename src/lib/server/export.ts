import type { Participant } from './participants';
import writeExcelFile from 'write-excel-file/node';

export async function exportParticipantsXlsx(participants: Participant[]): Promise<Buffer> {
  const headers = [
    'ID', 'Código', 'Nombre completo', 'Documento', 'Nacimiento', 'Género', 'País', 'Prefijo', 'Número', 'Teléfono completo', 'Correo',
    'Dirección', 'Municipio', 'Departamento', 'Distrito', 'Entidad', 'Función', 'Nivel educativo', 'Programa', 'Estado', 'Vigencia', 'Consentimiento', 'Creado'
  ];

  const rows = participants.map((participant) => [
    participant.id,
    participant.participant_code,
    participant.full_name,
    participant.document_number,
    participant.birth_date,
    participant.gender,
    participant.phone_country,
    participant.phone_dial_code,
    participant.phone_number,
    `${participant.phone_dial_code} ${participant.phone_number}`,
    participant.email ?? '',
    participant.address ?? '',
    participant.municipality ?? '',
    participant.department ?? '',
    participant.district ?? '',
    participant.organization ?? '',
    participant.role_function,
    participant.education_level ?? '',
    participant.program ?? '',
    participant.status,
    participant.lifecycle_state,
    participant.consent ? 'Sí' : 'No',
    participant.created_at,
  ]);

  return writeExcelFile([headers, ...rows], { sheet: 'Participantes' }).toBuffer();
}
