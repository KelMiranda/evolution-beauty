import { mapParticipantExportRows, type Participant } from './participants';
import writeExcelFile from 'write-excel-file/node';

export async function exportParticipantsXlsx(participants: Participant[]): Promise<Buffer> {
  const { headers, rows } = mapParticipantExportRows(participants);

  return writeExcelFile([headers, ...rows], { sheet: 'Participantes' }).toBuffer();
}
