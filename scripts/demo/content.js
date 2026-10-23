// Demo data and captions of the recorded walkthrough, one entry per application locale.
// Captions are voiced by Piper models, which read numbers, symbols and foreign words poorly,
// so the pronunciations spell them out for the voice: the keys are replaced as whole words.
// A caption can also be an object with the text and its own speech for special cases.
// Names and texts must pass the application validation: letters, punctuation, digits, pluses
// and spaces. Amounts follow the local prices of the country where the language is most used.

export default {
  en: {
    card: { tagline: 'Split shared expenses with friends', thanks: 'Thanks for watching!' },
    title: 'Weekend at the Lake',
    participants: {
      anna: { name: 'Anna', preferences: 'PayPal: anna@example.com' },
      ben: { name: 'Ben', preferences: 'Bank card ending 4242' },
      clara: { name: 'Clara' },
      tim: { name: 'Tim' },
      oscar: { name: 'Oscar' }
    },
    wine: 'Wine',
    expenses: {
      rent: { description: 'Cottage rent for two nights', amount: '480' },
      groceries: { description: 'Groceries and barbecue', amount: '186.40' },
      wine: { description: 'Three bottles of red wine', amount: '54' },
      taxi: { description: 'Taxi to the lake', amount: '65' }
    },
    loan: { comment: 'Loan for gas', amount: '40' },
    comment: 'Sent via PayPal. Thanks!',
    voice: { model: 'en_US-lessac-medium' },
    captions: {
      greeting: 'Hi! This is Split, a free app for splitting shared expenses.',
      about:
        'No sign-up is needed: just share the link with your friends, and all the data is encrypted right in the browser.',
      demo: 'Let’s see how it works by planning a weekend at the lake.',
      title: 'First, give the split a title.',
      participants: 'Add the participants. Transfer preferences tell others how to pay you back.',
      patron: 'Tim is Clara’s son. Clara pays for him, so their shares are added up.',
      removal: 'Oscar can’t come after all, so let’s select him and remove him.',
      category: 'Not everyone drinks wine, so let’s create a separate category for it.',
      rate: 'Ben likes wine the most, so his share in this category is 150%.',
      expenses: 'Now add the expenses. Common ones are shared by everyone.',
      categoryExpense: 'The wine is paid only by the participants of the Wine category.',
      taxi: 'Ben also paid for a taxi to the lake.',
      expenseRemoval:
        'But his employer covered the taxi, so this expense isn’t needed. Let’s remove it.',
      loan: 'Ben also lent Anna some money for gas. Let’s add it as a transfer, and Split takes it into account.',
      settlements: 'Split calculates the settlements with as few transfers as possible.',
      copy: 'The settlements can be copied as text and sent to a group chat.',
      transfer: 'When the money is sent, mark the settlement as completed.',
      transfers: 'The transfer is recorded, and the settlements are updated.',
      share: 'Share the link with your friends: everyone having it can view and edit the split.',
      outro: 'That’s it! Split is free and needs no sign-up. Try it at split.mayfleet.com',
      goodbye: 'Thanks for watching, and see you soon!'
    }
  },
  ru: {
    card: { tagline: 'Делите общие расходы с друзьями', thanks: 'Спасибо за внимание!' },
    title: 'Выходные на озере',
    participants: {
      anna: { name: 'Аня', preferences: 'СБП: +7 900 123-45-67' },
      ben: { name: 'Борис', preferences: 'Карта Т-Банка 4242' },
      clara: { name: 'Катя' },
      tim: { name: 'Тёма' },
      oscar: { name: 'Олег' }
    },
    wine: 'Вино',
    expenses: {
      rent: { description: 'Аренда домика на две ночи', amount: '18000' },
      groceries: { description: 'Продукты и шашлык', amount: '7384.50' },
      wine: { description: 'Три бутылки красного вина', amount: '2370' },
      taxi: { description: 'Такси до озера', amount: '1850' }
    },
    loan: { comment: 'Взаймы на бензин', amount: '1000' },
    comment: 'Перевела по СБП. Спасибо!',
    voice: { model: 'ru_RU-irina-medium', lengthScale: 0.85 },
    pronunciations: {
      'split.mayfleet.com': 'сплит точка мэйфлит точка ком',
      Split: 'Сплит',
      '150%': 'сто пятьдесят процентов',
      // With the exclamation the voice draws the phrase out
      'Вот и всё!': 'Вот и всё,',
      // The voice draws the double consonant out
      ссылкой: 'сылкой'
    },
    captions: {
      greeting: 'Привет! Это Split — бесплатное приложение для разделения общих расходов.',
      about:
        'Регистрация не нужна: достаточно поделиться ссылкой с друзьями, а все данные шифруются прямо в браузере.',
      demo: 'Давайте посмотрим, как это работает, на примере выходных на озере.',
      title: 'Сначала дадим сплиту название.',
      participants:
        'Добавим участников. В предпочтениях по переводу можно указать, куда отправлять деньги.',
      patron: 'Тёма — сын Кати. Катя платит за него, и их доли складываются.',
      removal: 'Олег всё-таки не сможет поехать, поэтому отметим его и удалим.',
      category: 'Вино пьют не все, поэтому заведём для него отдельную категорию.',
      rate: 'Борис любит вино больше всех, так что его доля в этой категории — 150%.',
      expenses: 'Теперь добавим расходы. Общие расходы делятся на всех.',
      categoryExpense: 'За вино заплатят только участники категории «Вино».',
      taxi: 'Борис также оплатил такси до озера.',
      expenseRemoval:
        'Но такси Борису компенсировали на работе, так что этот расход не нужен. Удалим его.',
      loan: 'А ещё Борис одолжил Ане денег на бензин. Добавим это как перевод, и Split его учтёт.',
      settlements: 'Split рассчитывает взаиморасчёты с минимальным числом переводов.',
      copy: 'Взаиморасчёты можно скопировать текстом и отправить в общий чат.',
      transfer: 'Когда деньги отправлены, отметим расчёт как выполненный.',
      transfers: 'Перевод сохранён, а взаиморасчёты пересчитаны.',
      share: 'Поделитесь ссылкой с друзьями: все, у кого она есть, могут смотреть и менять сплит.',
      outro: 'Вот и всё! Split бесплатный и не требует регистрации. Попробуйте: split.mayfleet.com',
      goodbye: 'Спасибо за внимание и до встречи!'
    }
  },
  es: {
    card: { tagline: 'Reparte gastos comunes con amigos', thanks: '¡Gracias por vernos!' },
    title: 'Fin de semana en el lago',
    participants: {
      anna: { name: 'Ana', preferences: 'Bizum: 600 123 456' },
      ben: { name: 'Bruno', preferences: 'Tarjeta terminada en 4242' },
      clara: { name: 'Carla' },
      tim: { name: 'Tomás' },
      oscar: { name: 'Óscar' }
    },
    wine: 'Vino',
    expenses: {
      rent: { description: 'Alquiler de la casa por dos noches', amount: '320' },
      groceries: { description: 'Compras y barbacoa', amount: '145.60' },
      wine: { description: 'Tres botellas de vino tinto', amount: '24' },
      taxi: { description: 'Taxi al lago', amount: '45' }
    },
    loan: { comment: 'Préstamo para gasolina', amount: '30' },
    comment: 'Enviado por Bizum. ¡Gracias!',
    voice: { model: 'es_ES-sharvard-medium', speaker: 1 },
    pronunciations: {
      'split.mayfleet.com': 'split punto méiflit punto com',
      '150%': 'ciento cincuenta por ciento'
    },
    captions: {
      greeting: '¡Hola! Esto es Split, una aplicación gratuita para repartir gastos comunes.',
      about:
        'No hace falta registrarse: basta con compartir el enlace con tus amigos, y todos los datos se cifran en el navegador.',
      demo: 'Veamos cómo funciona organizando un fin de semana en el lago.',
      title: 'Primero, pongamos un título al split.',
      participants:
        'Añadimos a los participantes. Las preferencias de transferencia indican cómo pagarles.',
      patron: 'Tomás es el hijo de Carla. Carla paga por él, así que sus partes se suman.',
      removal: 'Óscar al final no puede venir, así que lo seleccionamos y lo eliminamos.',
      category: 'No todos beben vino, así que creamos una categoría aparte.',
      rate: 'A Bruno es a quien más le gusta el vino, así que su parte en esta categoría es del 150%.',
      expenses: 'Ahora añadimos los gastos. Los comunes se reparten entre todos.',
      categoryExpense: 'El vino lo pagan solo los participantes de la categoría Vino.',
      taxi: 'Bruno también pagó un taxi al lago.',
      expenseRemoval:
        'Pero se lo reembolsaron en el trabajo, así que este gasto sobra. Lo eliminamos.',
      loan: 'Además, Bruno le prestó a Ana dinero para gasolina. Lo añadimos como transferencia y Split lo tiene en cuenta.',
      settlements: 'Split calcula las liquidaciones con el menor número de transferencias posible.',
      copy: 'Las liquidaciones se pueden copiar como texto y enviar al chat del grupo.',
      transfer: 'Cuando se envía el dinero, marcamos la liquidación como completada.',
      transfers: 'La transferencia queda registrada y las liquidaciones se actualizan.',
      share: 'Comparte el enlace con tus amigos: quien lo tenga puede ver y editar el split.',
      outro: '¡Eso es todo! Split es gratis y no requiere registro. Pruébalo en split.mayfleet.com',
      goodbye: '¡Gracias por vernos y hasta pronto!'
    }
  },
  pt: {
    card: { tagline: 'Divida despesas em grupo com amigos', thanks: 'Obrigado por assistir!' },
    title: 'Fim de semana no lago',
    participants: {
      anna: { name: 'Ana', preferences: 'Pix: ana@example.com' },
      ben: { name: 'Bruno', preferences: 'Cartão com final 4242' },
      clara: { name: 'Carla' },
      tim: { name: 'Tomás' },
      oscar: { name: 'Otávio' }
    },
    wine: 'Vinho',
    expenses: {
      rent: { description: 'Aluguel da casa por duas noites', amount: '1400' },
      groceries: { description: 'Mercado e churrasco', amount: '620.90' },
      wine: { description: 'Três garrafas de vinho tinto', amount: '195' },
      taxi: { description: 'Táxi até o lago', amount: '120' }
    },
    loan: { comment: 'Empréstimo para gasolina', amount: '100' },
    comment: 'Enviado por Pix. Obrigada!',
    voice: { model: 'pt_BR-faber-medium' },
    pronunciations: {
      'split.mayfleet.com': 'split ponto mêiflit ponto com',
      '150%': 'cento e cinquenta por cento'
    },
    captions: {
      greeting: 'Olá! Este é o Split, um app gratuito para dividir despesas em grupo.',
      about:
        'Não precisa de cadastro: basta compartilhar o link com os amigos, e todos os dados são criptografados no navegador.',
      demo: 'Vamos ver como funciona planejando um fim de semana no lago.',
      title: 'Primeiro, vamos dar um título ao split.',
      participants:
        'Adicionamos os participantes. As preferências de transferência mostram como pagar a cada um.',
      patron: 'Tomás é filho da Carla. Ela paga por ele, então as partes dos dois se somam.',
      removal: 'O Otávio acabou não podendo ir, então vamos selecioná-lo e removê-lo.',
      category: 'Nem todo mundo bebe vinho, então criamos uma categoria separada para ele.',
      rate: 'Bruno é quem mais gosta de vinho, então a parte dele nesta categoria é de 150%.',
      expenses: 'Agora adicionamos as despesas. As comuns são divididas entre todos.',
      categoryExpense: 'O vinho é pago só pelos participantes da categoria Vinho.',
      taxi: 'O Bruno também pagou um táxi até o lago.',
      expenseRemoval:
        'Mas a empresa reembolsou o táxi, então essa despesa não é necessária. Vamos removê-la.',
      loan: 'Além disso, o Bruno emprestou dinheiro para a Ana pôr gasolina. Adicionamos isso como transferência, e o Split leva em conta.',
      settlements: 'O Split calcula os acertos com o menor número possível de transferências.',
      copy: 'Os acertos podem ser copiados como texto e enviados no chat do grupo.',
      transfer: 'Quando o dinheiro é enviado, marcamos o acerto como concluído.',
      transfers: 'A transferência fica registrada e os acertos são atualizados.',
      share: 'Compartilhe o link com os amigos: quem tiver o link pode ver e editar o split.',
      outro:
        'É isso! O Split é gratuito e não precisa de cadastro. Experimente em split.mayfleet.com',
      goodbye: 'Obrigado por assistir e até a próxima!'
    }
  },
  de: {
    card: { tagline: 'Gemeinsame Ausgaben mit Freunden teilen', thanks: 'Danke fürs Zuschauen!' },
    title: 'Wochenende am See',
    participants: {
      anna: { name: 'Anna', preferences: 'PayPal: anna@example.com' },
      ben: { name: 'Ben', preferences: 'IBAN DE89 3704 0044 0532 0130 00' },
      clara: { name: 'Clara' },
      tim: { name: 'Tim' },
      oscar: { name: 'Olaf' }
    },
    wine: 'Wein',
    expenses: {
      rent: { description: 'Ferienhaus für zwei Nächte', amount: '340' },
      groceries: { description: 'Einkäufe und Grillen', amount: '168.70' },
      wine: { description: 'Drei Flaschen Rotwein', amount: '27' },
      taxi: { description: 'Taxi zum See', amount: '58' }
    },
    loan: { comment: 'Geliehen fürs Tanken', amount: '30' },
    comment: 'Per PayPal gesendet. Danke!',
    voice: { model: 'de_DE-thorsten-medium' },
    pronunciations: {
      'split.mayfleet.com': 'Splitt Punkt Mäjfliet Punkt kom',
      Split: 'Splitt',
      '150%': 'hundertfünfzig Prozent',
      Überweisungspräferenzen: 'Überweisungs-Präferenzen',
      Browser: 'Brauser',
      Gruppenchat: 'Gruppentschätt'
    },
    captions: {
      greeting: 'Hallo! Das ist Split, eine kostenlose App zum Aufteilen gemeinsamer Ausgaben.',
      about:
        'Keine Anmeldung nötig: Teile einfach den Link mit Freunden, und alle Daten werden direkt im Browser verschlüsselt.',
      demo: 'Schauen wir uns an, wie es funktioniert, und planen ein Wochenende am See.',
      title: 'Zuerst geben wir dem Split einen Titel.',
      participants:
        'Wir fügen die Teilnehmer hinzu. Die Überweisungspräferenzen zeigen, wie man ihnen Geld schickt.',
      patron: 'Tim ist Claras Sohn. Clara zahlt für ihn, daher werden ihre Anteile addiert.',
      removal: 'Olaf kann doch nicht mitkommen, also markieren wir ihn und entfernen ihn.',
      category: 'Nicht alle trinken Wein, also legen wir dafür eine eigene Kategorie an.',
      rate: 'Ben mag Wein am meisten, daher beträgt sein Anteil in dieser Kategorie 150%.',
      expenses: 'Jetzt fügen wir die Ausgaben hinzu. Gemeinsame Ausgaben teilen sich alle.',
      categoryExpense: 'Den Wein bezahlen nur die Teilnehmer der Kategorie Wein.',
      taxi: 'Ben hat außerdem ein Taxi zum See bezahlt.',
      expenseRemoval:
        'Aber sein Arbeitgeber hat das Taxi erstattet, die Ausgabe wird also nicht gebraucht. Wir entfernen sie.',
      loan: 'Außerdem hat Ben Anna Geld fürs Tanken geliehen. Wir erfassen das als Überweisung, und Split berücksichtigt es.',
      settlements: 'Split berechnet die Abrechnungen mit möglichst wenigen Überweisungen.',
      copy: 'Die Abrechnungen lassen sich als Text kopieren und in den Gruppenchat schicken.',
      transfer: 'Sobald das Geld gesendet ist, markieren wir die Abrechnung als erledigt.',
      transfers: 'Die Überweisung ist erfasst, und die Abrechnungen werden aktualisiert.',
      share: 'Teile den Link mit Freunden: Wer ihn hat, kann den Split ansehen und bearbeiten.',
      outro:
        'Das war’s! Split ist kostenlos und ohne Anmeldung. Probiere es auf split.mayfleet.com',
      goodbye: 'Danke fürs Zuschauen und bis bald!'
    }
  },
  fr: {
    card: {
      tagline: 'Partagez les dépenses communes entre amis',
      thanks: 'Merci de votre attention !'
    },
    title: 'Week-end au lac',
    participants: {
      anna: { name: 'Anne', preferences: 'Lydia: 06 12 34 56 78' },
      ben: { name: 'Bruno', preferences: 'RIB FR76 3000 6000 0112 3456 7890 189' },
      clara: { name: 'Claire' },
      tim: { name: 'Théo' },
      oscar: { name: 'Olivier' }
    },
    wine: 'Vin',
    expenses: {
      rent: { description: 'Location du chalet pour deux nuits', amount: '360' },
      groceries: { description: 'Courses et barbecue', amount: '172.40' },
      wine: { description: 'Trois bouteilles de vin rouge', amount: '36' },
      taxi: { description: 'Taxi jusqu’au lac', amount: '55' }
    },
    loan: { comment: 'Prêt pour l’essence', amount: '30' },
    comment: 'Envoyé par Lydia. Merci !',
    voice: { model: 'fr_FR-tom-medium' },
    pronunciations: {
      'split.mayfleet.com': 'Splite point Mèflite point com',
      Split: 'Splite',
      '150 %': 'cent cinquante pour cent',
      'week-end': 'wouikènde'
    },
    captions: {
      greeting:
        'Bonjour ! Voici Split, une application gratuite pour partager les dépenses communes.',
      about:
        'Pas besoin d’inscription : il suffit de partager le lien avec vos amis, et toutes les données sont chiffrées dans le navigateur.',
      demo: 'Voyons comment ça marche en organisant un week-end au lac.',
      title: 'D’abord, donnons un titre au split.',
      participants:
        'Ajoutons les participants. Les préférences de virement indiquent comment les rembourser.',
      patron: 'Théo est le fils de Claire. Claire paie pour lui, donc leurs parts s’additionnent.',
      removal: 'Finalement, Olivier ne peut pas venir, alors sélectionnons-le et supprimons-le.',
      category: 'Tout le monde ne boit pas de vin, alors créons une catégorie à part.',
      rate: 'Bruno aime le vin plus que les autres, donc sa part dans cette catégorie est de 150 %.',
      expenses: 'Ajoutons maintenant les dépenses. Les dépenses communes sont partagées par tous.',
      categoryExpense: 'Le vin n’est payé que par les participants de la catégorie Vin.',
      taxi: 'Bruno a aussi payé un taxi jusqu’au lac.',
      expenseRemoval:
        'Mais son employeur l’a remboursé, donc cette dépense n’est plus utile. Supprimons-la.',
      loan: 'Bruno a aussi prêté à Anne de l’argent pour l’essence. Ajoutons-le comme virement, et Split en tient compte.',
      settlements: 'Split calcule les règlements avec le moins de virements possible.',
      copy: 'Les règlements peuvent être copiés en texte et envoyés dans la discussion du groupe.',
      transfer: 'Une fois l’argent envoyé, marquons le règlement comme effectué.',
      transfers: 'Le virement est enregistré et les règlements sont mis à jour.',
      share:
        'Partagez le lien avec vos amis : tous ceux qui l’ont peuvent voir et modifier le split.',
      outro:
        'C’est tout ! Split est gratuit et sans inscription. Essayez-le sur split.mayfleet.com',
      goodbye: 'Merci de votre attention et à bientôt !'
    }
  }
}
