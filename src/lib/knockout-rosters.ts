export type KnockoutScorerRole = "star" | "forward" | "field";

export type KnockoutRosterPlayer = {
  name: string;
  role: KnockoutScorerRole;
};

export type KnockoutScorerOption = KnockoutRosterPlayer & {
  team: string;
  side: "home" | "away";
};

export const knockoutScorerRolePoints: Record<KnockoutScorerRole, number> = {
  star: 1,
  forward: 2,
  field: 3,
};

export const knockoutScorerRoleLabels: Record<KnockoutScorerRole, string> = {
  star: "Figura +1",
  forward: "Delantero +2",
  field: "Medio/defensa +3",
};

const knockoutTeamAliases: Record<string, string[]> = {
  Argentina: ["Argentina"],
  Belgica: ["Belgica", "Belgium"],
  Espana: ["Espana", "Spain"],
  Francia: ["Francia", "France"],
  Inglaterra: ["Inglaterra", "England"],
  Marruecos: ["Marruecos", "Morocco"],
  Noruega: ["Noruega", "Norway"],
  Suiza: ["Suiza", "Switzerland", "Suisse", "Schweiz"],
};

export const knockoutTeamRosters: Record<string, KnockoutRosterPlayer[]> = {
  Argentina: [
    { name: "Lionel Messi", role: "star" },
    { name: "Julian Alvarez", role: "forward" },
    { name: "Nicolas Gonzalez", role: "forward" },
    { name: "Thiago Almada", role: "forward" },
    { name: "Giuliano Simeone", role: "forward" },
    { name: "Jose Manuel Lopez", role: "forward" },
    { name: "Lautaro Martinez", role: "forward" },
    { name: "Juan Musso", role: "field" },
    { name: "Geronimo Rulli", role: "field" },
    { name: "Emiliano Martinez", role: "field" },
    { name: "Marcos Senesi", role: "field" },
    { name: "Nicolas Tagliafico", role: "field" },
    { name: "Gonzalo Montiel", role: "field" },
    { name: "Lisandro Martinez", role: "field" },
    { name: "Cristian Romero", role: "field" },
    { name: "Nicolas Otamendi", role: "field" },
    { name: "Facundo Medina", role: "field" },
    { name: "Nahuel Molina", role: "field" },
    { name: "Leandro Paredes", role: "field" },
    { name: "Rodrigo De Paul", role: "field" },
    { name: "Valentin Barco", role: "field" },
    { name: "Giovani Lo Celso", role: "field" },
    { name: "Exequiel Palacios", role: "field" },
    { name: "Nicolas Paz", role: "field" },
    { name: "Alexis Mac Allister", role: "field" },
    { name: "Enzo Fernandez", role: "field" },
  ],
  Belgica: [
    { name: "Romelu Lukaku", role: "star" },
    { name: "Leandro Trossard", role: "forward" },
    { name: "Jeremy Doku", role: "forward" },
    { name: "Dodi Lukebakio", role: "forward" },
    { name: "Matias Fernandez-Pardo", role: "forward" },
    { name: "Thibaut Courtois", role: "field" },
    { name: "Senne Lammens", role: "field" },
    { name: "Mike Penders", role: "field" },
    { name: "Zeno Debast", role: "field" },
    { name: "Arthur Theate", role: "field" },
    { name: "Brandon Mechele", role: "field" },
    { name: "Maxim de Cuyper", role: "field" },
    { name: "Thomas Meunier", role: "field" },
    { name: "Koni De Winter", role: "field" },
    { name: "Joaquin Seys", role: "field" },
    { name: "Timothy Castagne", role: "field" },
    { name: "Nathan Ngoy", role: "field" },
    { name: "Axel Witsel", role: "field" },
    { name: "Kevin De Bruyne", role: "field" },
    { name: "Youri Tielemans", role: "field" },
    { name: "Charles de Ketelaere", role: "field" },
    { name: "Diego Moreira", role: "field" },
    { name: "Hans Vanaken", role: "field" },
    { name: "Alexis Saelemaekers", role: "field" },
    { name: "Nicolas Raskin", role: "field" },
    { name: "Amadou Onana", role: "field" },
  ],
  Espana: [
    { name: "Lamine Yamal", role: "star" },
    { name: "Ferran Torres", role: "forward" },
    { name: "Yeremy Pino", role: "forward" },
    { name: "Alex Baena", role: "forward" },
    { name: "Nico Williams", role: "forward" },
    { name: "Mikel Oyarzabal", role: "forward" },
    { name: "Victor Munoz", role: "forward" },
    { name: "Borja Iglesias", role: "forward" },
    { name: "David Raya", role: "field" },
    { name: "Joan Garcia", role: "field" },
    { name: "Unai Simon", role: "field" },
    { name: "Marc Pubill", role: "field" },
    { name: "Alex Grimaldo", role: "field" },
    { name: "Eric Garcia", role: "field" },
    { name: "Marcos Llorente", role: "field" },
    { name: "Pedro Porro", role: "field" },
    { name: "Aymeric Laporte", role: "field" },
    { name: "Pau Cubarsi", role: "field" },
    { name: "Marc Cucurella", role: "field" },
    { name: "Mikel Merino", role: "field" },
    { name: "Fabian Ruiz", role: "field" },
    { name: "Gavi", role: "field" },
    { name: "Dani Olmo", role: "field" },
    { name: "Rodri Hernandez", role: "field" },
    { name: "Martin Zubimendi", role: "field" },
    { name: "Pedri", role: "field" },
  ],
  Francia: [
    { name: "Kylian Mbappe", role: "star" },
    { name: "Ousmane Dembele", role: "forward" },
    { name: "Marcus Thuram", role: "forward" },
    { name: "Michael Olise", role: "forward" },
    { name: "Bradley Barcola", role: "forward" },
    { name: "Desire Doue", role: "forward" },
    { name: "Jean Philippe Mateta", role: "forward" },
    { name: "Maghnes Akliouche", role: "forward" },
    { name: "Brice Samba", role: "field" },
    { name: "Mike Maignan", role: "field" },
    { name: "Robin Risser", role: "field" },
    { name: "Malo Gusto", role: "field" },
    { name: "Lucas Digne", role: "field" },
    { name: "Dayot Upamecano", role: "field" },
    { name: "Jules Kounde", role: "field" },
    { name: "Ibrahima Konate", role: "field" },
    { name: "William Saliba", role: "field" },
    { name: "Theo Hernandez", role: "field" },
    { name: "Lucas Hernandez", role: "field" },
    { name: "Maxence Lacroix", role: "field" },
    { name: "Manu Kone", role: "field" },
    { name: "Aurelien Tchouameni", role: "field" },
    { name: "N'Golo Kante", role: "field" },
    { name: "Adrien Rabiot", role: "field" },
    { name: "Warren Zaire-Emery", role: "field" },
    { name: "Rayan Cherki", role: "field" },
  ],
  Inglaterra: [
    { name: "Harry Kane", role: "star" },
    { name: "Bukayo Saka", role: "forward" },
    { name: "Marcus Rashford", role: "forward" },
    { name: "Anthony Gordon", role: "forward" },
    { name: "Ollie Watkins", role: "forward" },
    { name: "Noni Madueke", role: "forward" },
    { name: "Ivan Toney", role: "forward" },
    { name: "Jordan Pickford", role: "field" },
    { name: "Dean Henderson", role: "field" },
    { name: "James Trafford", role: "field" },
    { name: "Ezri Konsa", role: "field" },
    { name: "Nico O'Reilly", role: "field" },
    { name: "John Stones", role: "field" },
    { name: "Marc Guehi", role: "field" },
    { name: "Trevoh Chalobah", role: "field" },
    { name: "Dan Burn", role: "field" },
    { name: "Reece James", role: "field" },
    { name: "Djed Spence", role: "field" },
    { name: "Jarell Quansah", role: "field" },
    { name: "Declan Rice", role: "field" },
    { name: "Elliot Anderson", role: "field" },
    { name: "Jude Bellingham", role: "field" },
    { name: "Jordan Henderson", role: "field" },
    { name: "Kobbie Mainoo", role: "field" },
    { name: "Morgan Rogers", role: "field" },
    { name: "Eberechi Eze", role: "field" },
  ],
  Marruecos: [
    { name: "Brahim Diaz", role: "star" },
    { name: "Chemsdine Talbi", role: "forward" },
    { name: "Soufiane Rahimi", role: "forward" },
    { name: "Gessime Yassine", role: "forward" },
    { name: "Amine Sbai", role: "forward" },
    { name: "Ayoub El Kaabi", role: "forward" },
    { name: "Ayoube Amaimouni-Echghouyab", role: "forward" },
    { name: "Yassine Bounou", role: "field" },
    { name: "Munir El Kajoui", role: "field" },
    { name: "Ahmed Reda Tagnaouti", role: "field" },
    { name: "Hakimi", role: "field" },
    { name: "Noussair Mazraoui", role: "field" },
    { name: "Marwane Saadane", role: "field" },
    { name: "Zakaria El Ouahdi", role: "field" },
    { name: "Issa Diop", role: "field" },
    { name: "Chadi Riad", role: "field" },
    { name: "Youssef Belammari", role: "field" },
    { name: "Redouane Halhal", role: "field" },
    { name: "Anass Salah-Eddine", role: "field" },
    { name: "Sofyan Amrabat", role: "field" },
    { name: "Ayyoub Bouaddi", role: "field" },
    { name: "Azzedine Ounahi", role: "field" },
    { name: "Ismael Saibari", role: "field" },
    { name: "Samir El Mourabet", role: "field" },
    { name: "Bilel El Khanouss", role: "field" },
    { name: "Neil El Aynaoui", role: "field" },
  ],
  Noruega: [
    { name: "Erling Haaland", role: "star" },
    { name: "Alexander Sorloth", role: "forward" },
    { name: "Jorgen Strand Larsen", role: "forward" },
    { name: "Antonio Nusa", role: "forward" },
    { name: "Andreas Schjelderup", role: "forward" },
    { name: "Oscar Bobb", role: "forward" },
    { name: "Jens Hauge", role: "forward" },
    { name: "Orjan Nyland", role: "field" },
    { name: "Sander Tangvik", role: "field" },
    { name: "Egil Selvik", role: "field" },
    { name: "Kristoffer Ajer", role: "field" },
    { name: "Leo Oestigaard", role: "field" },
    { name: "David Moller Wolfe", role: "field" },
    { name: "Fredrik Bjorkan", role: "field" },
    { name: "Marcus Pedersen", role: "field" },
    { name: "Torbjorn Heggem", role: "field" },
    { name: "Sondre Langas", role: "field" },
    { name: "Henrik Falchener", role: "field" },
    { name: "Julian Ryerson", role: "field" },
    { name: "Morten Thorsby", role: "field" },
    { name: "Patrick Berg", role: "field" },
    { name: "Sander Berge", role: "field" },
    { name: "Martin Odegaard", role: "field" },
    { name: "Fredrik Aursnes", role: "field" },
    { name: "Kristian Thorstvedt", role: "field" },
    { name: "Thelo Aasgaard", role: "field" },
  ],
  Suiza: [
    { name: "Breel Embolo", role: "star" },
    { name: "Dan Ndoye", role: "forward" },
    { name: "Ruben Vargas", role: "forward" },
    { name: "Noah Okafor", role: "forward" },
    { name: "Zeki Amdouni", role: "forward" },
    { name: "Cedric Itten", role: "forward" },
    { name: "Gregor Kobel", role: "field" },
    { name: "Yvon Mvogo", role: "field" },
    { name: "Marvin Keller", role: "field" },
    { name: "Miro Muheim", role: "field" },
    { name: "Silvan Widmer", role: "field" },
    { name: "Nico Elvedi", role: "field" },
    { name: "Manuel Akanji", role: "field" },
    { name: "Ricardo Rodriguez", role: "field" },
    { name: "Eray Cumart", role: "field" },
    { name: "Aurele Amenda", role: "field" },
    { name: "Luca Jaquez", role: "field" },
    { name: "Denis Zakaria", role: "field" },
    { name: "Remo Freuler", role: "field" },
    { name: "Johan Manzambi", role: "field" },
    { name: "Granit Xhaka", role: "field" },
    { name: "Ardon Jashari", role: "field" },
    { name: "Djibril Sow", role: "field" },
    { name: "Christian Fassnacht", role: "field" },
    { name: "Fabian Rieder", role: "field" },
    { name: "Xherdan Shaqiri", role: "field" },
  ],
};

export function normalizeRosterText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ÃƒÂ©/gi, "e")
    .replace(/Ã©/gi, "e")
    .replace(/ÃƒÂ±/gi, "n")
    .replace(/Ã±/gi, "n")
    .replace(/ÃƒÂ¡/gi, "a")
    .replace(/Ã¡/gi, "a")
    .replace(/ÃƒÂ­/gi, "i")
    .replace(/Ã­/gi, "i")
    .replace(/ÃƒÂ³/gi, "o")
    .replace(/Ã³/gi, "o")
    .replace(/ÃƒÂº/gi, "u")
    .replace(/Ãº/gi, "u")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function canonicalTeamName(team: string) {
  const normalized = normalizeRosterText(team);
  return Object.entries(knockoutTeamAliases).find(([, aliases]) =>
    aliases.some((alias) => normalizeRosterText(alias) === normalized),
  )?.[0];
}

export function getKnockoutRoster(team: string) {
  const key = canonicalTeamName(team);
  return key ? knockoutTeamRosters[key] ?? [] : [];
}

export function getKnockoutScorerOptions(home: string, away: string): KnockoutScorerOption[] {
  return [
    ...getKnockoutRoster(home).map((player) => ({ ...player, team: home, side: "home" as const })),
    ...getKnockoutRoster(away).map((player) => ({ ...player, team: away, side: "away" as const })),
  ];
}

export function getKnockoutScorerRole(teamA: string, teamB: string, scorerName: string) {
  const normalizedScorer = normalizeRosterText(scorerName);
  if (!normalizedScorer) return undefined;

  const options = getKnockoutScorerOptions(teamA, teamB);
  return options.find((player) => normalizeRosterText(player.name) === normalizedScorer)?.role;
}
