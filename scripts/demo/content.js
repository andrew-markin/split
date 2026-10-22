// Demo data and captions of the recorded walkthrough, one entry per application locale.
// Captions are voiced by Piper models, which read numbers, symbols and foreign words poorly,
// so the pronunciations spell them out for the voice: the keys are replaced as whole words.
// A caption can also be an object with the text and its own speech for special cases.
// Names and texts must pass the application validation: letters, punctuation, digits, pluses
// and spaces. Amounts follow the local prices of the country where the language is most used.

export default {
  en: {
    title: 'Weekend at the Lake',
    participants: {
      anna: { name: 'Anna', preferences: 'PayPal: anna@example.com' },
      ben: { name: 'Ben', preferences: 'Bank card ending 4242' },
      clara: { name: 'Clara' },
      tim: { name: 'Tim' }
    },
    wine: 'Wine',
    expenses: {
      rent: { description: 'Cottage rent for two nights', amount: '480' },
      groceries: { description: 'Groceries and barbecue', amount: '186.40' },
      wine: { description: 'Three bottles of red wine', amount: '54' }
    },
    comment: 'Sent via PayPal. Thanks!',
    voice: { model: 'en_US-lessac-medium' },
    captions: {
      intro: 'Split helps friends share common expenses. Let’s plan a weekend at the lake.',
      title: 'First, give the split a title.',
      participants: 'Add the participants. Transfer preferences tell others how to pay you back.',
      patron: 'Tim is Clara’s son. Clara pays for him, so their shares are added up.',
      category: 'Not everyone drinks wine, so let’s create a separate category for it.',
      rate: 'Ben likes wine the most, so his share in this category is 150%.',
      expenses: 'Now add the expenses. Common ones are shared by everyone.',
      categoryExpense: 'The wine is paid only by the participants of the Wine category.',
      settlements: 'Split calculates the settlements with as few transfers as possible.',
      transfer: 'When the money is sent, mark the settlement as completed.',
      transfers: 'The transfer is recorded, and the settlements are updated.',
      share: 'Share the link with your friends: everyone having it can view and edit the split.',
      outro: 'Split is free and needs no sign-up. Try it at split.mayfleet.com'
    }
  },
  ru: {
    title: 'Выходные на озере',
    participants: {
      anna: { name: 'Аня', preferences: 'СБП: +7 900 123-45-67' },
      ben: { name: 'Борис', preferences: 'Карта Т-Банка 4242' },
      clara: { name: 'Катя' },
      tim: { name: 'Тёма' }
    },
    wine: 'Вино',
    expenses: {
      rent: { description: 'Аренда домика на две ночи', amount: '18000' },
      groceries: { description: 'Продукты и шашлык', amount: '7384.50' },
      wine: { description: 'Три бутылки красного вина', amount: '2370' }
    },
    comment: 'Перевела по СБП. Спасибо!',
    voice: { model: 'ru_RU-irina-medium', lengthScale: 0.85 },
    pronunciations: {
      'split.mayfleet.com': 'сплит точка мэйфлит точка ком',
      Split: 'Сплит',
      '150%': 'сто пятьдесят процентов'
    },
    captions: {
      intro: 'Split помогает делить общие расходы. Давайте спланируем выходные на озере.',
      title: 'Сначала дадим сплиту название.',
      participants:
        'Добавим участников. В предпочтениях по переводу можно указать, куда отправлять деньги.',
      patron: 'Тёма — сын Кати. Катя платит за него, и их доли складываются.',
      category: 'Вино пьют не все, поэтому заведём для него отдельную категорию.',
      rate: 'Борис любит вино больше всех, так что его доля в этой категории — 150%.',
      expenses: 'Теперь добавим расходы. Общие расходы делятся на всех.',
      categoryExpense: 'За вино заплатят только участники категории «Вино».',
      settlements: 'Split рассчитывает взаиморасчёты с минимальным числом переводов.',
      transfer: 'Когда деньги отправлены, отметим расчёт как выполненный.',
      transfers: 'Перевод сохранён, а взаиморасчёты пересчитаны.',
      share: 'Поделитесь ссылкой с друзьями: все, у кого она есть, могут смотреть и менять сплит.',
      outro: 'Split бесплатный и не требует регистрации. Попробуйте: split.mayfleet.com'
    }
  },
  es: {
    title: 'Fin de semana en el lago',
    participants: {
      anna: { name: 'Ana', preferences: 'Bizum: 600 123 456' },
      ben: { name: 'Bruno', preferences: 'Tarjeta terminada en 4242' },
      clara: { name: 'Carla' },
      tim: { name: 'Tomás' }
    },
    wine: 'Vino',
    expenses: {
      rent: { description: 'Alquiler de la casa por dos noches', amount: '320' },
      groceries: { description: 'Compras y barbacoa', amount: '145.60' },
      wine: { description: 'Tres botellas de vino tinto', amount: '24' }
    },
    comment: 'Enviado por Bizum. ¡Gracias!',
    voice: { model: 'es_ES-sharvard-medium', speaker: 1 },
    pronunciations: {
      'split.mayfleet.com': 'split punto méiflit punto com',
      '150%': 'ciento cincuenta por ciento'
    },
    captions: {
      intro: 'Split ayuda a repartir gastos comunes. Organicemos un fin de semana en el lago.',
      title: 'Primero, pongamos un título al split.',
      participants:
        'Añadimos a los participantes. Las preferencias de transferencia indican cómo pagarles.',
      patron: 'Tomás es el hijo de Carla. Carla paga por él, así que sus partes se suman.',
      category: 'No todos beben vino, así que creamos una categoría aparte.',
      rate: 'A Bruno es a quien más le gusta el vino, así que su parte en esta categoría es del 150%.',
      expenses: 'Ahora añadimos los gastos. Los comunes se reparten entre todos.',
      categoryExpense: 'El vino lo pagan solo los participantes de la categoría Vino.',
      settlements: 'Split calcula las liquidaciones con el menor número de transferencias posible.',
      transfer: 'Cuando se envía el dinero, marcamos la liquidación como completada.',
      transfers: 'La transferencia queda registrada y las liquidaciones se actualizan.',
      share: 'Comparte el enlace con tus amigos: quien lo tenga puede ver y editar el split.',
      outro: 'Split es gratis y no requiere registro. Pruébalo en split.mayfleet.com'
    }
  },
  pt: {
    title: 'Fim de semana no lago',
    participants: {
      anna: { name: 'Ana', preferences: 'Pix: ana@example.com' },
      ben: { name: 'Bruno', preferences: 'Cartão com final 4242' },
      clara: { name: 'Carla' },
      tim: { name: 'Tomás' }
    },
    wine: 'Vinho',
    expenses: {
      rent: { description: 'Aluguel da casa por duas noites', amount: '1400' },
      groceries: { description: 'Mercado e churrasco', amount: '620.90' },
      wine: { description: 'Três garrafas de vinho tinto', amount: '195' }
    },
    comment: 'Enviado por Pix. Obrigada!',
    voice: { model: 'pt_BR-faber-medium' },
    pronunciations: {
      'split.mayfleet.com': 'split ponto mêiflit ponto com',
      '150%': 'cento e cinquenta por cento'
    },
    captions: {
      intro: 'O Split ajuda a dividir despesas em grupo. Vamos planejar um fim de semana no lago.',
      title: 'Primeiro, vamos dar um título ao split.',
      participants:
        'Adicionamos os participantes. As preferências de transferência mostram como pagar a cada um.',
      patron: 'Tomás é filho da Carla. Ela paga por ele, então as partes dos dois se somam.',
      category: 'Nem todo mundo bebe vinho, então criamos uma categoria separada para ele.',
      rate: 'Bruno é quem mais gosta de vinho, então a parte dele nesta categoria é de 150%.',
      expenses: 'Agora adicionamos as despesas. As comuns são divididas entre todos.',
      categoryExpense: 'O vinho é pago só pelos participantes da categoria Vinho.',
      settlements: 'O Split calcula os acertos com o menor número possível de transferências.',
      transfer: 'Quando o dinheiro é enviado, marcamos o acerto como concluído.',
      transfers: 'A transferência fica registrada e os acertos são atualizados.',
      share: 'Compartilhe o link com os amigos: quem tiver o link pode ver e editar o split.',
      outro: 'O Split é gratuito e não precisa de cadastro. Experimente em split.mayfleet.com'
    }
  },
  de: {
    title: 'Wochenende am See',
    participants: {
      anna: { name: 'Anna', preferences: 'PayPal: anna@example.com' },
      ben: { name: 'Ben', preferences: 'IBAN DE89 3704 0044 0532 0130 00' },
      clara: { name: 'Clara' },
      tim: { name: 'Tim' }
    },
    wine: 'Wein',
    expenses: {
      rent: { description: 'Ferienhaus für zwei Nächte', amount: '340' },
      groceries: { description: 'Einkäufe und Grillen', amount: '168.70' },
      wine: { description: 'Drei Flaschen Rotwein', amount: '27' }
    },
    comment: 'Per PayPal gesendet. Danke!',
    voice: { model: 'de_DE-thorsten-medium' },
    pronunciations: {
      'split.mayfleet.com': 'Splitt Punkt Mäjfliet Punkt kom',
      Split: 'Splitt',
      '150%': 'hundertfünfzig Prozent',
      Überweisungspräferenzen: 'Überweisungs-Präferenzen'
    },
    captions: {
      intro: 'Split hilft, gemeinsame Ausgaben aufzuteilen. Planen wir ein Wochenende am See.',
      title: 'Zuerst geben wir dem Split einen Titel.',
      participants:
        'Wir fügen die Teilnehmer hinzu. Die Überweisungspräferenzen zeigen, wie man ihnen Geld schickt.',
      patron: 'Tim ist Claras Sohn. Clara zahlt für ihn, daher werden ihre Anteile addiert.',
      category: 'Nicht alle trinken Wein, also legen wir dafür eine eigene Kategorie an.',
      rate: 'Ben mag Wein am meisten, daher beträgt sein Anteil in dieser Kategorie 150%.',
      expenses: 'Jetzt fügen wir die Ausgaben hinzu. Gemeinsame Ausgaben teilen sich alle.',
      categoryExpense: 'Den Wein bezahlen nur die Teilnehmer der Kategorie Wein.',
      settlements: 'Split berechnet die Abrechnungen mit möglichst wenigen Überweisungen.',
      transfer: 'Sobald das Geld gesendet ist, markieren wir die Abrechnung als erledigt.',
      transfers: 'Die Überweisung ist erfasst, und die Abrechnungen werden aktualisiert.',
      share: 'Teile den Link mit Freunden: Wer ihn hat, kann den Split ansehen und bearbeiten.',
      outro: 'Split ist kostenlos und ohne Anmeldung. Probiere es auf split.mayfleet.com'
    }
  },
  fr: {
    title: 'Week-end au lac',
    participants: {
      anna: { name: 'Anne', preferences: 'Lydia: 06 12 34 56 78' },
      ben: { name: 'Bruno', preferences: 'RIB FR76 3000 6000 0112 3456 7890 189' },
      clara: { name: 'Claire' },
      tim: { name: 'Théo' }
    },
    wine: 'Vin',
    expenses: {
      rent: { description: 'Location du chalet pour deux nuits', amount: '360' },
      groceries: { description: 'Courses et barbecue', amount: '172.40' },
      wine: { description: 'Trois bouteilles de vin rouge', amount: '36' }
    },
    comment: 'Envoyé par Lydia. Merci !',
    voice: { model: 'fr_FR-tom-medium' },
    pronunciations: {
      'split.mayfleet.com': 'Splite point Mèflite point com',
      Split: 'Splite',
      '150 %': 'cent cinquante pour cent',
      'week-end': 'wouikènde'
    },
    captions: {
      intro: 'Split aide à partager les dépenses communes. Organisons un week-end au lac.',
      title: 'D’abord, donnons un titre au split.',
      participants:
        'Ajoutons les participants. Les préférences de virement indiquent comment les rembourser.',
      patron: 'Théo est le fils de Claire. Claire paie pour lui, donc leurs parts s’additionnent.',
      category: 'Tout le monde ne boit pas de vin, alors créons une catégorie à part.',
      rate: 'Bruno aime le vin plus que les autres, donc sa part dans cette catégorie est de 150 %.',
      expenses: 'Ajoutons maintenant les dépenses. Les dépenses communes sont partagées par tous.',
      categoryExpense: 'Le vin n’est payé que par les participants de la catégorie Vin.',
      settlements: 'Split calcule les règlements avec le moins de virements possible.',
      transfer: 'Une fois l’argent envoyé, marquons le règlement comme effectué.',
      transfers: 'Le virement est enregistré et les règlements sont mis à jour.',
      share:
        'Partagez le lien avec vos amis : tous ceux qui l’ont peuvent voir et modifier le split.',
      outro: 'Split est gratuit et sans inscription. Essayez-le sur split.mayfleet.com'
    }
  }
}
