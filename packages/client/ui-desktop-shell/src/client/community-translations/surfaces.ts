/** Current rc.1 right-sidebar and document-preview copy for every community locale. */
import { COMMUNITY_TRANSLATIONS } from './index.ts'

type Dictionary = Record<string, string>
interface SurfaceCopy {
  sidebarRight: Dictionary
  sidebarDocumentPreview: Dictionary
  documentMarkdown: Dictionary
  sidebarPdf: Dictionary
  documentHtml: Dictionary
  sidebarCodePreview: Dictionary
  sidebarImage: Dictionary
}
interface SurfaceExtra {
  right: readonly [string, string, string, string, string, string, string]
  preview: readonly [string, string, string, string, string, string, string]
  markdown: readonly [string, string, string, string]
  pdf: readonly [string, string, string, string, string, string, string, string, string]
  html: readonly [string, string, string, string]
  code: readonly [string, string, string]
  image: readonly [string, string, string, string, string]
}

function legacy(locale: keyof typeof COMMUNITY_TRANSLATIONS, namespace: string): Dictionary {
  return (COMMUNITY_TRANSLATIONS[locale] as Record<string, Dictionary>)[namespace] ?? {}
}

function surface(locale: keyof typeof COMMUNITY_TRANSLATIONS, extra: SurfaceExtra): SurfaceCopy {
  const right = legacy(locale, 'sidebarRight')
  const preview = legacy(locale, 'sidebarTextpreview')
  return {
    sidebarRight: {
      'chrome.expand': right['chrome.expand'] ?? '', 'chrome.expandAria': extra.right[0],
      'chrome.collapse': right['chrome.collapse'] ?? '', 'chrome.collapseAria': extra.right[1],
      'chrome.toFullscreen': right['chrome.toFullscreen'] ?? '', 'chrome.exitFullscreen': right['chrome.exitFullscreen'] ?? '',
      'dock.emptyPane': right['dock.emptyPane'] ?? '', 'dock.splitPane': right['dock.splitPane'] ?? '',
      'dock.splitPaneDisabled': right['dock.splitPaneDisabled'] ?? '', 'dock.splitPaneNarrow': right['dock.splitPaneNarrow'] ?? '',
      'dock.closeTab': right['dock.closeTab'] ?? '', 'dock.addTab': right['dock.addTab'] ?? '',
      'dock.dockFloat': right['dock.dockFloat'] ?? '', 'dock.closeFloat': right['dock.closeFloat'] ?? '',
      'dock.drop.center': extra.right[2], 'dock.drop.left': extra.right[3], 'dock.drop.right': extra.right[4],
      'dock.drop.top': extra.right[5], 'dock.drop.bottom': extra.right[6],
      'tab.guide.title': right['tab.guide.title'] ?? '', 'tab.unavailable': right['tab.unavailable'] ?? '',
    },
    sidebarDocumentPreview: {
      loading: preview.loading ?? '', loadMore: preview.loadMore ?? '', changed: preview.changed ?? '',
      reloadNow: preview.reloadNow ?? '', reload: preview.reload ?? '',
      'wrap.enable': extra.preview[0], 'wrap.disable': extra.preview[1], 'wrap.aria': extra.preview[2],
      openWith: extra.preview[3], 'viewer.text': extra.preview[4], resourceUnavailable: extra.preview[5], rendererUnavailable: extra.preview[6],
      'error.notFound': preview['error.notFound'] ?? '', 'error.tooLarge': preview['error.tooLarge'] ?? '',
      'error.notText': preview['error.notText'] ?? '', 'error.notRegularFile': preview['error.notRegularFile'] ?? '',
      'error.unavailable': preview['error.unavailable'] ?? '', retry: preview.retry ?? '',
    },
    documentMarkdown: { 'viewer.label': extra.markdown[0], 'code.copy': extra.markdown[1], 'code.copied': extra.markdown[2], footnotes: extra.markdown[3] },
    sidebarPdf: {
      title: extra.pdf[0], pageImage: extra.pdf[1], loading: extra.pdf[2], rendering: extra.pdf[3], failed: extra.pdf[4],
      password: extra.pdf[5], workerFailed: extra.pdf[6], unsupported: extra.pdf[7], retry: extra.pdf[8],
    },
    documentHtml: { title: extra.html[0], frame: extra.html[1], loading: extra.html[2], failed: extra.html[3] },
    sidebarCodePreview: { title: extra.code[0], copy: extra.code[1], copied: extra.code[2] },
    sidebarImage: {
      title: extra.image[0], preview: extra.image[1], loading: extra.image[2], failed: extra.image[3],
      unsupported: extra.image[4],
    },
  }
}

const ja = surface('ja', {
  right: ['右サイドバーを開く', '右サイドバーを閉じる', 'ここへ移動', '左に分割', '右に分割', '上に分割', '下に分割'],
  preview: ['行を折り返す', '行の折り返しを解除', '行の折り返し', '表示方法', 'プレーンテキスト', 'ファイルリソースサービスを利用できません。', '{name} プレビューを利用できません。'],
  markdown: ['Markdown', 'コピー', 'コピー済み', '脚注'],
  pdf: ['PDF', 'PDF の {page} ページ', 'PDF を開いています…', 'ページを描画しています…', 'PDF を表示できません：{message}', 'この PDF はパスワードが必要なため、プレビューできません。', 'PDF 描画プロセスを続行できません。再試行してください。', 'PDF のプレビューにはファイル全体が必要です。', '再試行'],
  html: ['HTML', 'HTML プレビュー', 'HTML を読み込んでいます…', 'HTML を表示できません。'],
  code: ['コード', 'コピー', 'コピー済み'],
  image: ['画像', '画像プレビュー：{name}', '画像を開いています…', '画像を表示できません。', '画像のプレビューにはファイル全体が必要です。'],
})
const ko = surface('ko', {
  right: ['오른쪽 사이드바 열기', '오른쪽 사이드바 접기', '여기로 이동', '왼쪽에 분할', '오른쪽에 분할', '위에 분할', '아래에 분할'],
  preview: ['줄 바꿈 켜기', '줄 바꿈 끄기', '줄 바꿈', '다음으로 열기', '일반 텍스트', '파일 리소스 서비스를 사용할 수 없습니다.', '{name} 미리보기를 사용할 수 없습니다.'],
  markdown: ['Markdown', '복사', '복사됨', '각주'],
  pdf: ['PDF', 'PDF {page}페이지', 'PDF 여는 중…', '페이지 렌더링 중…', 'PDF를 표시할 수 없음: {message}', '이 PDF에는 암호가 필요하여 미리보기를 지원하지 않습니다.', 'PDF 렌더링 프로세스를 계속할 수 없습니다. 다시 시도하세요.', 'PDF 미리보기에는 전체 파일 내용이 필요합니다.', '다시 시도'],
  html: ['HTML', 'HTML 미리보기', 'HTML 불러오는 중…', 'HTML을 표시할 수 없습니다.'],
  code: ['코드', '복사', '복사됨'],
  image: ['이미지', '이미지 미리보기: {name}', '이미지 여는 중…', '이미지를 표시할 수 없습니다.', '이미지 미리보기에는 전체 파일 내용이 필요합니다.'],
})
const es = surface('es', {
  right: ['Abrir barra lateral derecha', 'Contraer barra lateral derecha', 'Mover aquí', 'Dividir a la izquierda', 'Dividir a la derecha', 'Dividir arriba', 'Dividir abajo'],
  preview: ['Activar ajuste de línea', 'Desactivar ajuste de línea', 'Ajuste de línea', 'Abrir con', 'Texto sin formato', 'El servicio de recursos de archivos no está disponible.', 'La vista previa de {name} no está disponible.'],
  markdown: ['Markdown', 'Copiar', 'Copiado', 'Notas al pie'],
  pdf: ['PDF', 'Página {page} del PDF', 'Abriendo PDF…', 'Renderizando página…', 'No se puede mostrar el PDF: {message}', 'Este PDF requiere contraseña y no se puede previsualizar.', 'El proceso de renderizado del PDF no puede continuar. Inténtalo de nuevo.', 'La vista previa del PDF necesita el archivo completo.', 'Reintentar'],
  html: ['HTML', 'Vista previa HTML', 'Cargando HTML…', 'No se puede mostrar el HTML.'],
  code: ['Código', 'Copiar', 'Copiado'],
  image: ['Imagen', 'Vista previa de imagen: {name}', 'Abriendo imagen…', 'No se puede mostrar la imagen.', 'La vista previa de la imagen necesita el archivo completo.'],
})
const fr = surface('fr', {
  right: ['Ouvrir la barre latérale droite', 'Réduire la barre latérale droite', 'Déplacer ici', 'Diviser à gauche', 'Diviser à droite', 'Diviser en haut', 'Diviser en bas'],
  preview: ['Activer le retour à la ligne', 'Désactiver le retour à la ligne', 'Retour à la ligne', 'Ouvrir avec', 'Texte brut', 'Le service de ressources de fichiers est indisponible.', 'L’aperçu {name} est indisponible.'],
  markdown: ['Markdown', 'Copier', 'Copié', 'Notes de bas de page'],
  pdf: ['PDF', 'Page {page} du PDF', 'Ouverture du PDF…', 'Rendu de la page…', 'Impossible d’afficher le PDF : {message}', 'Ce PDF nécessite un mot de passe et ne peut pas être prévisualisé.', 'Le processus de rendu PDF ne peut pas continuer. Réessayez.', 'L’aperçu PDF nécessite le fichier complet.', 'Réessayer'],
  html: ['HTML', 'Aperçu HTML', 'Chargement du HTML…', 'Impossible d’afficher le HTML.'],
  code: ['Code', 'Copier', 'Copié'],
  image: ['Image', 'Aperçu de l’image : {name}', 'Ouverture de l’image…', 'Impossible d’afficher l’image.', 'L’aperçu de l’image nécessite le fichier complet.'],
})
const de = surface('de', {
  right: ['Rechte Seitenleiste öffnen', 'Rechte Seitenleiste einklappen', 'Hierher verschieben', 'Links teilen', 'Rechts teilen', 'Oben teilen', 'Unten teilen'],
  preview: ['Zeilenumbruch aktivieren', 'Zeilenumbruch deaktivieren', 'Zeilenumbruch', 'Öffnen mit', 'Nur Text', 'Der Dateiressourcendienst ist nicht verfügbar.', 'Die {name}-Vorschau ist nicht verfügbar.'],
  markdown: ['Markdown', 'Kopieren', 'Kopiert', 'Fußnoten'],
  pdf: ['PDF', 'PDF-Seite {page}', 'PDF wird geöffnet…', 'Seite wird gerendert…', 'PDF kann nicht angezeigt werden: {message}', 'Dieses PDF benötigt ein Passwort und kann nicht angezeigt werden.', 'Der PDF-Renderer kann nicht fortfahren. Bitte erneut versuchen.', 'Die PDF-Vorschau benötigt die vollständige Datei.', 'Erneut versuchen'],
  html: ['HTML', 'HTML-Vorschau', 'HTML wird geladen…', 'HTML kann nicht angezeigt werden.'],
  code: ['Code', 'Kopieren', 'Kopiert'],
  image: ['Bild', 'Bildvorschau: {name}', 'Bild wird geöffnet…', 'Bild kann nicht angezeigt werden.', 'Die Bildvorschau benötigt die vollständige Datei.'],
})
const ptBR = surface('pt-BR', {
  right: ['Abrir barra lateral direita', 'Recolher barra lateral direita', 'Mover para cá', 'Dividir à esquerda', 'Dividir à direita', 'Dividir acima', 'Dividir abaixo'],
  preview: ['Ativar quebra de linha', 'Desativar quebra de linha', 'Quebra de linha', 'Abrir com', 'Texto simples', 'O serviço de recursos de arquivo não está disponível.', 'A visualização de {name} não está disponível.'],
  markdown: ['Markdown', 'Copiar', 'Copiado', 'Notas de rodapé'],
  pdf: ['PDF', 'Página {page} do PDF', 'Abrindo PDF…', 'Renderizando página…', 'Não foi possível exibir o PDF: {message}', 'Este PDF exige senha e não pode ser visualizado.', 'O processo de renderização do PDF não pode continuar. Tente novamente.', 'A visualização do PDF precisa do arquivo completo.', 'Tentar novamente'],
  html: ['HTML', 'Visualização de HTML', 'Carregando HTML…', 'Não foi possível exibir o HTML.'],
  code: ['Código', 'Copiar', 'Copiado'],
  image: ['Imagem', 'Visualização da imagem: {name}', 'Abrindo imagem…', 'Não foi possível exibir a imagem.', 'A visualização da imagem precisa do arquivo completo.'],
})
const ru = surface('ru', {
  right: ['Открыть правую боковую панель', 'Свернуть правую боковую панель', 'Переместить сюда', 'Разделить слева', 'Разделить справа', 'Разделить сверху', 'Разделить снизу'],
  preview: ['Включить перенос строк', 'Отключить перенос строк', 'Перенос строк', 'Открыть с помощью', 'Обычный текст', 'Служба файловых ресурсов недоступна.', 'Предпросмотр {name} недоступен.'],
  markdown: ['Markdown', 'Копировать', 'Скопировано', 'Сноски'],
  pdf: ['PDF', 'Страница PDF {page}', 'Открытие PDF…', 'Отрисовка страницы…', 'Не удалось показать PDF: {message}', 'Для этого PDF нужен пароль; предпросмотр не поддерживается.', 'Процесс отрисовки PDF не может продолжить работу. Повторите попытку.', 'Для предпросмотра PDF нужен полный файл.', 'Повторить'],
  html: ['HTML', 'Предпросмотр HTML', 'Загрузка HTML…', 'Не удалось показать HTML.'],
  code: ['Код', 'Копировать', 'Скопировано'],
  image: ['Изображение', 'Предпросмотр изображения: {name}', 'Открытие изображения…', 'Не удалось показать изображение.', 'Для предпросмотра изображения нужен полный файл.'],
})

/** Replacement namespaces remove the obsolete text-preview surface and match rc.1 exactly. */
export const COMMUNITY_SURFACE_TRANSLATIONS = { ja, ko, es, fr, de, 'pt-BR': ptBR, ru } as const
