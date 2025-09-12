import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View } from 'react-native';
import { H1, Muted } from '@/components/ui/typography';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useRouter } from 'expo-router';

export default function PrivacyPolicy() {
  const router = useRouter();
  const today = new Date().toLocaleDateString();
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top","bottom"]}>
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-y-6">
        <H1>Politique de confidentialité – TeamUp</H1>
        <Muted>Dernière mise à jour: {today}</Muted>

        <View className="gap-y-3">
          <Text className="text-base font-semibold">1. Présentation générale</Text>
          <Text>
            TeamUp est une application permettant d’organiser et de rejoindre des événements sportifs,
            de créer et de gérer des équipes, d’échanger via des fonctionnalités sociales et de partager
            du contenu (photos/vidéos). Nous nous engageons à protéger vos données à caractère personnel
            et à respecter les principes du RGPD ainsi que les bonnes pratiques OWASP en matière de
            sécurité des applications. Cette politique explique quelles données nous traitons, pourquoi,
            pendant combien de temps, avec qui nous les partageons, et vos droits.
          </Text>
        </View>

        <View className="gap-y-3">
          <Text className="text-base font-semibold">2. Responsable de traitement</Text>
          <Text>
            Le responsable du traitement des données collectées via TeamUp est l’éditeur de l’application
            (“nous”). Pour toute demande relative à la protection des données, veuillez utiliser la section
            Aide de l’application ou l’adresse de contact indiquée sur la fiche boutique de l’app.
          </Text>
        </View>

        <View className="gap-y-3">
          <Text className="text-base font-semibold">3. Données collectées</Text>
          <Text>
            Nous collectons des données strictement nécessaires au fonctionnement et à l’amélioration
            du service. Selon les fonctionnalités utilisées, il peut s’agir des catégories suivantes:
          </Text>
          <View className="pl-3 gap-y-1">
            <Text>- Identité et compte: identifiant utilisateur, e‑mail, métadonnées d’authentification.</Text>
            <Text>- Profil: prénom, nom, âge (optionnel), région, photo de profil, rôle (organisateur/participant).</Text>
            <Text>- Préférences: sports sélectionnés, paramètres de notifications et de confidentialité.</Text>
            <Text>- Événements: événements créés, événements rejoints, inscriptions et statuts d’inscription.</Text>
            <Text>- Équipes: équipes créées/rejointes, invitations, codes d’invitation, membres d’équipe.</Text>
            <Text>- Contenus: médias (photos/vidéos) que vous importez volontairement.</Text>
            <Text>- Techniques: journaux d’accès et de sécurité, jetons push (le cas échéant).</Text>
            <Text>- Localisation: si vous renseignez une adresse d’événement; nous n’activons pas la géolocalisation continue.</Text>
          </View>
          <Text>
            Certaines données sont obligatoires (ex: identifiant) pour créer le compte. Les champs facultatifs
            sont signalés et peuvent être modifiés ou supprimés à tout moment depuis l’application.
          </Text>
        </View>

        <View className="gap-y-3">
          <Text className="text-base font-semibold">4. Finalités et bases légales</Text>
          <View className="pl-3 gap-y-1">
            <Text>- Fourniture du service (contrat): création/gestion de compte, profil, événements, équipes.</Text>
            <Text>- Sécurité et prévention de la fraude (intérêt légitime): journalisation, contrôle d’accès.</Text>
            <Text>- Amélioration du service (intérêt légitime): mesures d’usage agrégées et anonymisées.</Text>
            <Text>- Notifications (consentement): envoi de messages push si vous activez l’option.</Text>
          </View>
        </View>

        <View className="gap-y-3">
          <Text className="text-base font-semibold">5. Provenance des données</Text>
          <Text>
            Les données proviennent principalement de vous (formulaires, médias importés) et des interactions
            dans l’app (inscriptions, créations d’équipes). Certaines métadonnées techniques sont générées
            automatiquement pour la sécurité et le diagnostic.
          </Text>
        </View>

        <View className="gap-y-3">
          <Text className="text-base font-semibold">6. Partage avec des sous‑traitants</Text>
          <Text>
            Nous recourons à des prestataires d’hébergement et de diffusion (base de données, stockage de
            fichiers, notifications). Ces sous‑traitants n’utilisent vos données que pour notre compte et
            conformément à nos instructions contractuelles et aux exigences RGPD.
          </Text>
        </View>

        <View className="gap-y-3">
          <Text className="text-base font-semibold">7. Transferts internationaux</Text>
          <Text>
            Si des données sont traitées hors UE/EEE, nous mettons en place des garanties appropriées (clauses
            contractuelles types, mesures techniques/organisationnelles) afin d’assurer un niveau de protection
            adéquat.
          </Text>
        </View>

        <View className="gap-y-3">
          <Text className="text-base font-semibold">8. Durées de conservation</Text>
          <Text>
            Les données sont conservées pendant la durée de votre utilisation, puis supprimées ou anonymisées:
          </Text>
          <View className="pl-3 gap-y-1">
            <Text>- Compte et profil: jusqu’à suppression volontaire du compte.</Text>
            <Text>- Événements/équipes: tant qu’ils sont actifs; archives anonymisées possible.</Text>
            <Text>- Médias: jusqu’à suppression par vous; purge possible en cas d’inactivité prolongée.</Text>
            <Text>- Jetons push: supprimés à la désactivation des notifications ou à la déconnexion.</Text>
            <Text>- Journaux de sécurité: durée limitée au strict nécessaire (conformité/diagnostic).</Text>
          </View>
        </View>

        <View className="gap-y-3">
          <Text className="text-base font-semibold">9. Sécurité des données (OWASP, meilleures pratiques)</Text>
          <Text>
            Nous appliquons des contrôles d’accès stricts (RLS), le chiffrement en transit (TLS), une gestion
            sûre des jetons, la journalisation des actions critiques et des audits réguliers. Les dépendances
            sont mises à jour et des protections contre les attaques courantes (injection, XSS, IDOR) sont
            mises en place. L’export et la suppression des données sont intégrés à l’application.
          </Text>
        </View>

        <View className="gap-y-3">
          <Text className="text-base font-semibold">10. Cookies et traceurs</Text>
          <Text>
            L’application mobile n’utilise pas de cookies. La version web peut recourir à des cookies strictement
            techniques pour la session. Aucun traceur marketing n’est activé sans votre consentement explicite.
          </Text>
        </View>

        <View className="gap-y-3">
          <Text className="text-base font-semibold">11. Notifications push</Text>
          <Text>
            Les notifications ne sont envoyées qu’après votre opt‑in. Vous pouvez à tout moment désactiver
            l’option dans Paramètres (ou via les réglages système) et révoquer le jeton de notification.
          </Text>
        </View>

        <View className="gap-y-3">
          <Text className="text-base font-semibold">12. Contenus et médias</Text>
          <Text>
            Vous êtes responsable des contenus que vous importez (respect des droits, vie privée des tiers,
            absence de contenu illicite). Nous pouvons supprimer des contenus non conformes aux règles de
            l’application ou à la loi.
          </Text>
        </View>

        <View className="gap-y-3">
          <Text className="text-base font-semibold">13. Enfants et mineurs</Text>
          <Text>
            L’application n’est pas destinée aux enfants en dessous de l’âge requis par la législation locale
            pour consentir au traitement des données. Si vous pensez qu’un compte mineur a été créé sans
            autorisation, contactez‑nous pour suppression.
          </Text>
        </View>

        <View className="gap-y-3">
          <Text className="text-base font-semibold">14. Vos droits</Text>
          <View className="pl-3 gap-y-1">
            <Text>- Accès et portabilité: Paramètres → “Exporter mes données (JSON)”.</Text>
            <Text>- Rectification: modification du profil depuis l’app.</Text>
            <Text>- Suppression: Paramètres → “Supprimer mon compte”.</Text>
            <Text>- Opposition/limitations: désactivation notifications, retrait de médias, gestion d’équipe.</Text>
          </View>
          <Text>
            Nous répondons aux demandes dans les meilleurs délais et conformément aux exigences légales.
          </Text>
        </View>

        <View className="gap-y-3">
          <Text className="text-base font-semibold">15. Modifications de la politique</Text>
          <Text>
            Nous pouvons mettre à jour la présente politique pour refléter des évolutions légales, techniques
            ou fonctionnelles. En cas de changements majeurs, nous vous en informerons via l’application.
          </Text>
        </View>

        <View className="gap-y-3">
          <Text className="text-base font-semibold">16. Contact</Text>
          <Text>
            Pour toute question liée à la protection des données et à la sécurité, utilisez la section Aide
            dans l’app ou l’adresse de contact indiquée dans la fiche de l’application. Nous ferons le
            nécessaire pour répondre rapidement à vos demandes.
          </Text>
        </View>

        <Button variant="secondary" onPress={() => router.back()}>
          <Text>Fermer</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}


