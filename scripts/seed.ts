import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  console.log('🌱 Starting seed...\n');
  const client = await pool.connect();

  try {
    // Create admin user if not exists
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL ?? 'admin@example.com';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD ?? 'CHANGE_ME';

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [adminEmail, passwordHash, 'Administrador', 'admin', true]
    );

    const adminId = userResult.rows[0]?.id;
    if (!adminId) {
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
      await client.query('SELECT setval(\'users_id_seq\', (SELECT MAX(id) FROM users))');
    }
    console.log('✅ Admin user ensured\n');

    const facilitatorEmail = 'facilitator@example.com';
    const facilitatorPassword = 'CHANGE_ME';
    const facilitatorHash = await bcrypt.hash(facilitatorPassword, 10);

    await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         role = EXCLUDED.role,
         active = EXCLUDED.active,
         updated_at = NOW()`,
      [facilitatorEmail, facilitatorHash, 'María López', 'facilitador', true]
    );

    const facilitatorResult = await client.query<{ id: number }>('SELECT id FROM users WHERE email = $1 LIMIT 1', [facilitatorEmail]);
    const facilitatorId = facilitatorResult.rows[0]?.id;
    if (!facilitatorId) throw new Error('Facilitator seed failed');
    console.log('✅ Facilitator user ensured\n');

    // Seed courses
    const courses = [
      {
        name: 'Colorimetría Profesional',
        description: 'Domina la ciencia del color capilar. Aprende teoría del color, técnicas de decoloración, aplicación de tintes permanentes y semPermanentes, efectos de luz y sombra, y corrección de color. Ideal para estilistas que quieren ofrecer servicios completos de colorimetría.',
        category: 'Colorimetría',
        level: 'Intermedio',
        instructor: 'María Elena Menjívar',
        instructorBio: 'Especialista con 15 años de experiencia en salones de alta gama. Certificada por L\'Oréal Professionnel.',
        price: 125.00,
        priceOriginal: 175.00,
        image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
        fechaInicio: '2026-08-01',
        fechaFin: '2026-09-15',
        horario: 'Sábados 9:00 AM - 2:00 PM',
        ubicacion: 'Centro de Capacitación ACOES, San Salvador',
        lat: 13.6929,
        lng: -89.2182,
        cupoMaximo: 20,
        estado: 'enrolling',
        tags: ['coloración', 'tintes', 'decoloración', 'blondeaje'],
      },
      {
        name: 'Corte Clásico y Contemporáneo',
        description: 'Desde técnicas tradicionales hasta tendencias actuales. Aprende Cortes precisión, degradados, capas, recto, despuntes y cómo advising cada tipo de rostro y cabello. Incluye práctica en mannequin y modelos reales.',
        category: 'Corte',
        level: 'Básico',
        instructor: 'Carlos Roberto Menjívar',
        instructorBio: 'Barbero y estilista con 12 años de trayectoria. Especialista en barbería clásica y técnicas masculinas modernas.',
        price: 95.00,
        priceOriginal: 140.00,
        image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
        fechaInicio: '2026-08-03',
        fechaFin: '2026-08-28',
        horario: 'Lunes y Miércoles 5:00 PM - 8:00 PM',
        ubicacion: 'Centro de Capacitación ACOES, San Salvador',
        lat: 13.6929,
        lng: -89.2182,
        cupoMaximo: 25,
        estado: 'enrolling',
        tags: ['corte', 'barba', 'degradado', 'precision'],
      },
      {
        name: 'Manicure y Pedicure Spa',
        description: 'Técnicas profesionales de manicure y pedicure con enfoque spa. Incluye baño de parafina, exfoliación, hidratación profunda, esmaltado tradicional y gel, nail art básico y técnicas de sostenibilidad en el cuidado de uñas.',
        category: 'Manicure',
        level: 'Básico',
        instructor: 'Ana Sofía Pérez',
        instructorBio: 'Nail artist con certificación internacional. Ha trabajado para marcas como OPI y Essie en lanzamientos para Latinoamérica.',
        price: 75.00,
        priceOriginal: 110.00,
        image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800',
        fechaInicio: '2026-08-05',
        fechaFin: '2026-08-26',
        horario: 'Martes y Jueves 9:00 AM - 12:00 PM',
        ubicacion: 'Centro de Capacitación ACOES, San Salvador',
        lat: 13.6929,
        lng: -89.2182,
        cupoMaximo: 18,
        estado: 'enrolling',
        tags: ['uñas', 'gel', 'nailart', 'spa', 'pedicure'],
      },
      {
        name: 'Maquillaje Social y Eventual',
        description: 'Aprende a crear looks para eventos sociales, novias, xv años y campañas fotográficas. Cubrimos preparación de piel, corrección de tono, técnicas de contouring, miradas glamorosas y acabados duraderos con fotografía en mente.',
        category: 'Maquillaje',
        level: 'Intermedio',
        instructor: 'Daniela Isabel Cruz',
        instructorBio: 'Maquilladora profesional con experiencia en bodas de alto perfil y desfiles de moda. Certificada por MAC Cosmetics.',
        price: 150.00,
        priceOriginal: 200.00,
        image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800',
        fechaInicio: '2026-08-10',
        fechaFin: '2026-09-10',
        horario: 'Viernes 4:00 PM - 9:00 PM, Sábados 8:00 AM - 2:00 PM',
        ubicacion: 'Centro de Capacitación ACOES, San Salvador',
        lat: 13.6929,
        lng: -89.2182,
        cupoMaximo: 15,
        estado: 'enrolling',
        tags: ['novias', 'social', ' xv años', 'contouring', 'fotografía'],
      },
      {
        name: 'Tratamientos Capilares Avanzados',
        description: 'Protocolos profesionales para diagnóstico y tratamiento de problemas capilares. Incluye hidratación profunda, queratina, botox capilar, alisados orgánicos, tratamiento anticaída y protocolos para cabello dañado por químicos.',
        category: 'Tratamientos',
        level: 'Avanzado',
        instructor: 'María Elena Menjívar',
        instructorBio: 'Especialista con 15 años de experiencia en salones de alta gama. Certificada por L\'Oréal Professionnel.',
        price: 110.00,
        priceOriginal: 160.00,
        image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
        fechaInicio: '2026-09-01',
        fechaFin: '2026-09-20',
        horario: 'Sábados 2:00 PM - 7:00 PM',
        ubicacion: 'Centro de Capacitación ACOES, San Salvador',
        lat: 13.6929,
        lng: -89.2182,
        cupoMaximo: 20,
        estado: 'published',
        tags: ['keratina', 'botox', 'alisado', 'tratamiento'],
      },
      {
        name: 'Barbería Integral',
        description: 'El curso más completo de barbería. Incluye corte masculino, diseño de barba, afeitado clásico con navaja, tratamientos faciales masculinos, consulta de estilo y habilidades para gestionar tu propia barbería o椅队在沙龙.',
        category: 'Barbería',
        level: 'Avanzado',
        instructor: 'Carlos Roberto Menjívar',
        instructorBio: 'Barbero y estilista con 12 años de trayectoria. Especialista en barbería clásica y técnicas masculinas modernas.',
        price: 180.00,
        priceOriginal: 250.00,
        image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800',
        fechaInicio: '2026-09-15',
        fechaFin: '2026-10-30',
        horario: 'Lunes a Viernes 9:00 AM - 3:00 PM (intensivo)',
        ubicacion: 'Centro de Capacitación ACOES, San Salvador',
        lat: 13.6929,
        lng: -89.2182,
        cupoMaximo: 12,
        estado: 'published',
        tags: ['barba', 'navaja', 'facial', 'shaved', ' fades'],
      },
    ];

    let inserted = 0;
    for (const course of courses) {
      const facilitatorCourseId = course.name === 'Colorimetría Profesional' ? facilitatorId : null;
      await client.query(
        `INSERT INTO courses (
          name, description, category, level, facilitator_id, instructor, instructor_bio,
          price, price_original, image, fecha_inicio, fecha_fin, horario,
          ubicacion, lat, lng, cupo_maximo, inscritos, estado, tags,
          created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW(),NOW())
        ON CONFLICT DO NOTHING`,
        [
          course.name,
          course.description,
          course.category,
          course.level,
          facilitatorCourseId,
          course.instructor,
          course.instructorBio,
          course.price,
          course.priceOriginal,
          course.image,
          course.fechaInicio,
          course.fechaFin,
          course.horario,
          course.ubicacion,
          course.lat,
          course.lng,
          course.cupoMaximo,
          0,
          course.estado,
          JSON.stringify(course.tags),
        ]
      );
      inserted++;
      console.log(`  ✅ Inserted: ${course.name}`);
    }

    console.log(`\n🎉 Seed complete! ${inserted} courses added.`);
    console.log(`\n📧 Admin: ${adminEmail} / ${adminPassword}`);
        console.log(`📧 Facilitator: ${facilitatorEmail} / ${facilitatorPassword}`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
