import { _decorator, Component, Node, Canvas, Camera, Color, UITransform, Label, Layers, view, ResolutionPolicy, resources, JsonAsset, sys, tween, Vec3, UIOpacity, Mask, Graphics } from 'cc';
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
  shareAppMessage(options: {title: string; query: string}): void;
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
  private header!: Node;
  private caret!: Node;
  private caretPositions: Vec3[] = [];
  private resultMessage?: Label;
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
  private readonly onShare = () => ({title: this.session?.phase === 'finished' ? `我用了 ${this.session.seconds(Date.now()).toFixed(2)} 秒，你呢？` : '一起安静地打完这一篇', query: `article=${encodeURIComponent(this.article?.id ?? '')}`});
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
    camera.clearColor = new Color(0,0,0,255); camera.visibility = Layers.Enum.UI_2D;
    canvas.cameraComponent = camera;
    // Keep controls below the WeChat capsule and device notch.
    this.header = this.make('Header', this.root, 750, 1334);
    this.header.addComponent(UIOpacity);
    const brand = this.label('T Y P E.', this.header, -244, 490, 32, 170, 70);
    brand.fontFamily = 'sans-serif';
    this.timer = this.label('0', this.header, -290, 400, 30, 80, 50);
    this.timer.horizontalAlign = Label.HorizontalAlign.LEFT;
    this.timer.color = new Color(125,125,125);
    const restart = this.label('Restart', this.header, 250, 490, 30, 170, 80);
    restart.fontFamily = 'sans-serif';
    restart.node.on(Node.EventType.TOUCH_END, () => { if (this.articles.length) this.restart(); });
    const viewport = this.make('TextViewport', this.root, 630, 740); viewport.setPosition(0,-45);
    viewport.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
    this.body = this.make('Article', viewport, 630, 740);
    this.body.addComponent(UIOpacity);
    viewport.on(Node.EventType.TOUCH_END, () => this.focus());
    this.hint = this.label('正在加载…', this.root, 0, -450, 22, 640, 60);
    this.hint.color = new Color(110,110,110);
    this.hint.node.on(Node.EventType.TOUCH_END, () => this.focus());
    this.result = this.make('Result', this.root, 750, 1334); this.result.active = false;
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
      const id = wxApi?.getLaunchOptionsSync().query?.article ?? (typeof location !== 'undefined' ? new URLSearchParams(location.search).get('article') : undefined);
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
    this.body.getComponent(UIOpacity)!.opacity=255;
    this.header.getComponent(UIOpacity)!.opacity=255;
    this.resultMessage=undefined; this.caretPositions=[];
    let x=-310, y=335;
    const characters=Array.from(this.article.text);
    characters.forEach((c,i) => {
      const width=/[\u0000-\u007f]/.test(c)?17:31;
      if(x+width>310){x=-310;y-=65;}
      this.caretPositions.push(new Vec3(x-3,y,0));
      const l=this.label(c,this.body,x+width/2,y,30,width+2,54);
      l.color=new Color(112,112,112); this.letters.push(l);this.positions.push(y);x+=width;
      // Visual line breaks only: users do not have to enter extra newlines.
      if(/[，。！？；]/.test(c) && i<characters.length-1){x=-310;y-=65;}
    });
    this.caretPositions.push(new Vec3(x,y,0));
    this.caret=this.make('Caret',this.body,3,42);
    const ink=this.caret.addComponent(Graphics);ink.fillColor=new Color(255,158,35);
    ink.rect(-1.5,-21,3,42);ink.fill();this.caret.addComponent(UIOpacity);
    this.caret.setPosition(this.caretPositions[0]);
    this.hint.string='';
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
    this.caret.setPosition(this.caretPositions[this.session.cursor]);
    const nextRow=Math.max(0, Math.floor((335-this.positions[cursor])/65)-3);
    if(nextRow!==this.row){this.row=nextRow;tween(this.body).stop();this.body.setPosition(0,nextRow*65);}
    this.hint.string=states.includes('wrong')?'有错字，请删除后修改':'';
    if(this.session.phase==='finished')this.finish();
  }
  private finish(): void {
    this.acceptingInput=false;
    wxApi?.hideKeyboard();this.inputElement?.blur();this.hint.string='';
    const seconds=this.session.seconds(Date.now());
    this.body.getComponent(UIOpacity)!.opacity=50;
    this.header.getComponent(UIOpacity)!.opacity=65;
    this.caret.active=false;
    this.result.active=true;
    const [whole,fraction]=seconds.toFixed(2).split('.');
    const integerSize=whole.length>3?110:whole.length>2?150:190;
    const integerWidth=whole.length*integerSize*0.61;
    const decimalWidth=175, unitWidth=42, total=integerWidth+decimalWidth+unitWidth;
    const start=-total/2;
    this.label(whole,this.result,start+integerWidth/2,70,integerSize,integerWidth+8,240);
    this.label('.'+fraction,this.result,start+integerWidth+decimalWidth/2,37,100,decimalWidth+8,150);
    const unit=this.label('s',this.result,start+integerWidth+decimalWidth+unitWidth/2,15,52,unitWidth,80);
    unit.color=new Color(175,175,175);
    let message='这一刻，留下你的速度。';
    try {
      const raw=sys.localStorage.getItem('firstgame.records.v1');
      const records=raw?JSON.parse(raw):[];
      const list=Array.isArray(records)?records:[];
      const previous=list.slice().reverse().find(r=>r && r.articleId===this.article.id && Number.isFinite(r.seconds));
      if(previous) message=seconds<previous.seconds?'你的速度，超越了上一次的自己。':'每一次专注，都在积累。';
      list.push({articleId:this.article.id,seconds,at:new Date().toISOString()});
      sys.localStorage.setItem('firstgame.records.v1',JSON.stringify(list.slice(-50)));
    } catch { /* Storage failures must not interrupt a completed game. */ }
    this.resultMessage=this.label(message,this.result,0,-105,27,650,65);
    this.button('再来一次',-166,false,()=>this.restart());
    this.button('分享成绩',166,true,()=>{void this.shareResult();});
  }
  private button(text: string,x: number,light: boolean,action: () => void): void {
    const n=this.make('ResultAction',this.result,304,108);n.setPosition(x,-475);
    const g=n.addComponent(Graphics);g.fillColor=light?new Color(238,238,238):new Color(34,34,34);
    g.roundRect(-152,-54,304,108,28);g.fill();
    const label=this.label(text,n,0,0,29,280,80);label.color=light?Color.BLACK:Color.WHITE;
    n.on(Node.EventType.TOUCH_END,action);
  }
  private async shareResult(): Promise<void> {
    const data=this.onShare();
    if(wxApi){wxApi.shareAppMessage(data);return;}
    if(typeof navigator!=='undefined' && navigator.share){
      try {
        const url=new URL(location.href);url.searchParams.set('article',this.article.id);
        await navigator.share({title:'TYPE.',text:data.title,url:url.toString()});
      } catch(error) {
        if((error as {name?: string}).name!=='AbortError' && this.resultMessage)this.resultMessage.string='分享未完成，请重试。';
      }
    } else if(this.resultMessage) this.resultMessage.string='请使用微信分享，或截屏保存成绩。';
  }

  update(): void {
    if(!this.session)return;
    if(this.caret?.active)this.caret.getComponent(UIOpacity)!.opacity=Math.floor(Date.now()/550)%2?60:255;
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
