import { _decorator, Component, Node, Canvas, Camera, Color, UITransform, Label, Layers, view, ResolutionPolicy, resources, JsonAsset, sys, tween, Vec3, UIOpacity, Mask } from 'cc';
import { TypingSession, chooseArticle } from './TypingSession';
import type { Article } from './TypingSession';
const { ccclass } = _decorator;
type KeyboardEvent = { value: string };
interface Wechat {
  showKeyboard(options: {defaultValue: string; maxLength: number; multiple: boolean; confirmHold: boolean; confirmType: string; fail?: () => void}): void;
  hideKeyboard(options?: object): void;
  onKeyboardInput(cb: (e: KeyboardEvent) => void): void;
  offKeyboardInput(cb: (e: KeyboardEvent) => void): void;
  onKeyboardConfirm(cb: (e: KeyboardEvent) => void): void;
  offKeyboardConfirm(cb: (e: KeyboardEvent) => void): void;
  showShareMenu(options: object): void;
  onShareAppMessage(cb: () => {title: string; query: string}): void;
  offShareAppMessage(cb: () => {title: string; query: string}): void;
  getLaunchOptionsSync(): { query?: Record<string,string> };
  onShow(cb: (e: {query?: Record<string,string>}) => void): void;
  offShow(cb: (e: {query?: Record<string,string>}) => void): void;
}
const wxApi = (globalThis as unknown as {wx?: Wechat}).wx;
@ccclass('TypingGame')
export class TypingGame extends Component {
  private articles: Article[] = [];
  private article!: Article;
  private session!: TypingSession;
  private root!: Node;
  private body!: Node;
  private timer!: Label;
  private hint!: Label;
  private result!: Node;
  private letters: Label[] = [];
  private positions: number[] = [];
  private inputElement?: HTMLTextAreaElement;
  private composing = false;
  private acceptingInput = false;
  private lastSecond = -1;
  private row = 0;
  private readonly onInput = (e: KeyboardEvent) => this.accept(e.value);
  private readonly onShare = () => ({title: this.session?.phase === 'finished' ? `我用了 ${this.session.seconds(Date.now()).toFixed(1)} 秒，你呢？` : '一起安静地打完这一篇', query: `article=${encodeURIComponent(this.article?.id ?? '')}`});
  private readonly onShow = (e: {query?: Record<string,string>}) => {
    const article = this.articles.find(a => a.id === e.query?.article);
    if (article) this.restart(article);
  };
  onLoad(): void {
    view.setDesignResolutionSize(750, 1334, ResolutionPolicy.SHOW_ALL);
    this.root = this.make('Canvas', this.node, 750, 1334);
    const canvas = this.root.addComponent(Canvas);
    const cameraNode = new Node('Camera'); cameraNode.parent = this.root; cameraNode.setPosition(0,0,1000);
    const camera = cameraNode.addComponent(Camera); camera.projection = Camera.ProjectionType.ORTHO;
    camera.orthoHeight = 667; camera.near = 1; camera.far = 2000;
    camera.clearColor = new Color(8,8,8,255); camera.visibility = Layers.Enum.UI_2D;
    canvas.cameraComponent = camera;
    // Keep controls below the WeChat capsule and device notch.
    this.timer = this.label('0', this.root, -290, 490, 64, 130, 80);
    const restart = this.label('Restart', this.root, 250, 490, 30, 170, 80);
    restart.node.on(Node.EventType.TOUCH_END, () => { if (this.articles.length) this.restart(); });
    const viewport = this.make('TextViewport', this.root, 650, 610); viewport.setPosition(0,95);
    viewport.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
    this.body = this.make('Article', viewport, 650, 610);
    viewport.on(Node.EventType.TOUCH_END, () => this.focus());
    this.hint = this.label('正在加载…', this.root, 0, -260, 22, 640, 60);
    this.hint.color = new Color(110,110,110);
    this.hint.node.on(Node.EventType.TOUCH_END, () => this.focus());
    this.result = this.make('Result', this.root, 650, 600); this.result.active = false;
    if (wxApi) {
      wxApi.onKeyboardInput(this.onInput); wxApi.onKeyboardConfirm(this.onInput);
      wxApi.showShareMenu({menus:['shareAppMessage']}); wxApi.onShareAppMessage(this.onShare); wxApi.onShow(this.onShow);
    } else if (typeof document !== 'undefined') {
      const input = document.createElement('textarea'); this.inputElement = input;
      input.setAttribute('aria-label','输入上方文章'); input.autocomplete = 'off'; input.spellcheck = false;
      input.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0;font-size:16px;';
      document.body.appendChild(input);
      input.addEventListener('compositionstart',()=>{this.composing=true;});
      input.addEventListener('compositionend',()=>{this.composing=false;this.accept(input.value);});
      input.addEventListener('input',()=>{if(!this.composing)this.accept(input.value);});
      input.addEventListener('paste',e=>e.preventDefault());
    }
    resources.load('articles', JsonAsset, (error, asset) => {
      if (!this.isValid) return;
      if (error || !Array.isArray(asset?.json)) {this.hint.string='文章加载失败，请重新打开';return;}
      this.articles = (asset.json as Article[]).filter(a=>a.id && a.text && ['zh','en'].includes(a.language));
      if (!this.articles.length) {this.hint.string='文章配置为空';return;}
      const id = wxApi?.getLaunchOptionsSync().query?.article;
      this.restart(this.articles.find(a=>a.id===id));
    });
  }
  private make(name: string, parent: Node, w: number, h: number): Node {
    const n=new Node(name); n.layer=Layers.Enum.UI_2D; n.parent=parent;
    n.addComponent(UITransform).setContentSize(w,h); return n;
  }
  private label(text: string,parent: Node,x: number,y: number,size: number,w: number,h: number): Label {
    const n=this.make('Text',parent,w,h); n.setPosition(x,y);
    const l=n.addComponent(Label); l.string=text; l.fontSize=size; l.lineHeight=size+10;
    l.fontFamily='monospace'; l.color=new Color(240,240,240); l.horizontalAlign=Label.HorizontalAlign.CENTER;
    l.verticalAlign=Label.VerticalAlign.CENTER; return l;
  }
  private restart(article?: Article): void {
    this.acceptingInput=false;
    wxApi?.hideKeyboard(); this.inputElement?.blur();
    this.article=article ?? chooseArticle(this.articles,this.article?.id);
    this.session=new TypingSession(this.article.text); this.lastSecond=-1; this.row=0;
    this.result.active=false; this.result.removeAllChildren();
    this.body.removeAllChildren(); this.body.setPosition(0,0); this.letters=[]; this.positions=[];
    this.body.getComponent(UIOpacity)?.destroy();
    let x=-305, y=270;
    for (const c of Array.from(this.article.text)) {
      const width=/[\u0000-\u007f]/.test(c)?18:30;
      if(x+width>315){x=-305;y-=52;}
      const l=this.label(c,this.body,x+width/2,y,28,width+2,48);
      l.color=new Color(105,105,105); this.letters.push(l);this.positions.push(y);x+=width;
    }
    this.hint.string='轻触正文，开始输入';
    if(this.inputElement){this.inputElement.value='';this.inputElement.maxLength=this.article.text.length;}
  }
  private focus(): void {
    if(!this.session || this.session.phase==='finished')return;
    this.acceptingInput=true;
    if(wxApi) wxApi.showKeyboard({defaultValue:this.session.value,maxLength:this.article.text.length,multiple:true,confirmHold:true,confirmType:'done',fail:()=>{this.hint.string='键盘未打开，请再次轻触正文';}});
    else this.inputElement?.focus();
  }
  private accept(value: string): void {
    if(!this.acceptingInput || !this.session || this.session.phase==='finished')return;
    this.session.input(value,Date.now());
    const states=this.session.states;
    states.forEach((s,i)=>this.letters[i].color=s==='correct'?new Color(245,245,245):s==='wrong'?new Color(220,100,100):new Color(105,105,105));
    const cursor=Math.min(this.session.cursor,this.letters.length-1);
    if(states[cursor]==='pending')this.letters[cursor].color=new Color(255,255,255);
    const nextRow=Math.max(0, Math.floor((270-this.positions[cursor])/52)-3);
    if(nextRow!==this.row){this.row=nextRow;tween(this.body).stop();this.body.setPosition(0,nextRow*52);}
    this.hint.string=states.includes('wrong')?'有错字，请删除后修改':'';
    if(this.session.phase==='finished')this.finish();
  }
  private finish(): void {
    this.acceptingInput=false;
    wxApi?.hideKeyboard();this.inputElement?.blur();this.hint.string='';
    const seconds=this.session.seconds(Date.now());
    this.body.addComponent(UIOpacity).opacity=65;
    this.result.active=true;
    this.label(seconds.toFixed(1),this.result,0,120,142,650,190);
    this.label('秒',this.result,0,-5,30,300,70);
    try {
      const raw=sys.localStorage.getItem('firstgame.records.v1');
      const records=raw?JSON.parse(raw):[];
      const list=Array.isArray(records)?records:[];
      list.push({articleId:this.article.id,seconds,at:new Date().toISOString()});
      sys.localStorage.setItem('firstgame.records.v1',JSON.stringify(list.slice(-50)));
    } catch { /* Storage failures must not interrupt a completed game. */ }
  }
  update(): void {
    if(!this.session)return;
    const second=Math.floor(this.session.seconds(Date.now()));
    if(second===this.lastSecond)return;
    this.lastSecond=second;this.timer.string=String(second);
    this.timer.node.setScale(1,0.88,1);
    tween(this.timer.node).to(0.12,{scale:new Vec3(1,1,1)}).start();
  }
  onDestroy(): void {
    this.inputElement?.remove();
    wxApi?.offKeyboardInput(this.onInput);wxApi?.offKeyboardConfirm(this.onInput);
    wxApi?.offShareAppMessage(this.onShare);wxApi?.offShow(this.onShow);
  }
}
