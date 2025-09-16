import '@src/Popup.css';
import { t } from '@extension/i18n';
import { PROJECT_URL_OBJECT, useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton } from '@extension/ui';

const notificationOptions = {
  type: 'basic',
  iconUrl: chrome.runtime.getURL('icon-34.png'),
  title: 'Injecting content script error',
  message: 'You cannot inject script here!',
} as const;

const Popup = () => {
  const { isLight } = useStorage(exampleThemeStorage);
  const logo = isLight ? 'popup/logo_vertical.svg' : 'popup/logo_vertical_dark.svg';

  const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT);

  const injectContentScript = async () => {
    const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });

    if (tab.url!.startsWith('about:') || tab.url!.startsWith('chrome:')) {
      chrome.notifications.create('inject-error', notificationOptions);
    }

    await chrome.scripting
      .executeScript({
        target: { tabId: tab.id! },
        files: ['/content-runtime/example.iife.js', '/content-runtime/all.iife.js'],
      })
      .catch(err => {
        // Handling errors related to other paths
        if (err.message.includes('Cannot access a chrome:// URL')) {
          chrome.notifications.create('inject-error', notificationOptions);
        }
      });
  };

  const addCopyButton = async () => {
    const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });

    if (tab.url!.startsWith('about:') || tab.url!.startsWith('chrome:')) {
      return;
    }

    // 检查是否是知乎页面
    if (!tab.url!.includes('zhihu.com')) {
      return;
    }

    await chrome.scripting
      .executeScript({
        target: { tabId: tab.id! },
        func: () => {
          // 避免重复添加按钮
          if (document.getElementById('zhihu-copy-button')) {
            return;
          }

          // 创建侧边栏
          const sidebar = document.createElement('div');
          sidebar.id = 'zhihu-content-sidebar';
          sidebar.style.cssText = `
            position: fixed;
            top: 0;
            right: -400px;
            width: 400px;
            height: 100vh;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            border-left: 3px solid #667eea;
            z-index: 10001;
            transition: right 0.3s ease;
            overflow-y: auto;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            box-shadow: -5px 0 20px rgba(0,0,0,0.2);
          `;

          // 创建侧边栏头部
          const sidebarHeader = document.createElement('div');
          sidebarHeader.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            font-size: 18px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
          `;
          sidebarHeader.innerHTML = `
            <span>📋 复制内容预览</span>
            <button id="close-sidebar" style="
              background: transparent;
              border: none;
              color: white;
              font-size: 24px;
              cursor: pointer;
              padding: 0;
              width: 30px;
              height: 30px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: background 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.2)'" 
               onmouseout="this.style.background='transparent'">×</button>
          `;

          // 创建内容区域
          const sidebarContent = document.createElement('div');
          sidebarContent.id = 'sidebar-content';
          sidebarContent.style.cssText = `
            padding: 20px;
            line-height: 1.6;
            color: #333;
          `;

          // 创建底部操作区
          const sidebarFooter = document.createElement('div');
          sidebarFooter.style.cssText = `
            position: sticky;
            bottom: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 15px 20px;
            display: flex;
            gap: 10px;
          `;
          sidebarFooter.innerHTML = `
            <button id="copy-all-btn" style="
              flex: 1;
              background: rgba(255,255,255,0.2);
              color: white;
              border: 1px solid rgba(255,255,255,0.3);
              border-radius: 25px;
              padding: 10px;
              cursor: pointer;
              font-weight: bold;
              transition: all 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
               onmouseout="this.style.background='rgba(255,255,255,0.2)'">
              📋 复制全部
            </button>
            <button id="clear-content-btn" style="
              flex: 1;
              background: rgba(255,255,255,0.2);
              color: white;
              border: 1px solid rgba(255,255,255,0.3);
              border-radius: 25px;
              padding: 10px;
              cursor: pointer;
              font-weight: bold;
              transition: all 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
               onmouseout="this.style.background='rgba(255,255,255,0.2)'">
              🗑️ 清空
            </button>
          `;

          // 组装侧边栏
          sidebar.appendChild(sidebarHeader);
          sidebar.appendChild(sidebarContent);
          sidebar.appendChild(sidebarFooter);

          // 创建复制按钮
          const copyButton = document.createElement('button');
          copyButton.id = 'zhihu-copy-button';
          copyButton.textContent = '复制内容';
          copyButton.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 50px;
            padding: 15px 25px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          `;

          // 添加悬停效果
          copyButton.onmouseenter = () => {
            copyButton.style.transform = 'translateY(-2px)';
            copyButton.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
          };
          copyButton.onmouseleave = () => {
            copyButton.style.transform = 'translateY(0)';
            copyButton.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
          };

          // 逐行显示内容的函数
          const displayContentLineByLine = (content, targetElement) => {
            const lines = content.split('\n');
            targetElement.innerHTML = '';
            
            let currentIndex = 0;
            const displayNextLine = () => {
              if (currentIndex < lines.length) {
                const line = lines[currentIndex];
                const lineElement = document.createElement('div');
                lineElement.style.cssText = `
                  margin-bottom: 8px;
                  padding: 8px 12px;
                  background: rgba(255,255,255,0.8);
                  border-radius: 8px;
                  border-left: 4px solid #667eea;
                  opacity: 0;
                  transform: translateX(-20px);
                  transition: all 0.3s ease;
                  white-space: pre-wrap;
                  word-wrap: break-word;
                `;
                
                // 特殊样式处理
                if (line.startsWith('标题：')) {
                  lineElement.style.borderLeft = '4px solid #e74c3c';
                  lineElement.style.fontWeight = 'bold';
                  lineElement.style.fontSize = '16px';
                } else if (line.startsWith('--- 回答')) {
                  lineElement.style.borderLeft = '4px solid #f39c12';
                  lineElement.style.fontWeight = 'bold';
                  lineElement.style.background = 'rgba(243,156,18,0.1)';
                } else if (line.startsWith('问题描述：') || line.startsWith('文章内容：') || line.startsWith('回答内容：')) {
                  lineElement.style.borderLeft = '4px solid #27ae60';
                  lineElement.style.fontWeight = 'bold';
                }
                
                lineElement.textContent = line || ' '; // 空行显示为空格
                targetElement.appendChild(lineElement);
                
                // 动画显示
                setTimeout(() => {
                  lineElement.style.opacity = '1';
                  lineElement.style.transform = 'translateX(0)';
                }, 50);
                
                currentIndex++;
                setTimeout(displayNextLine, 100); // 每100ms显示一行
              }
            };
            displayNextLine();
          };

          // 复制功能
          copyButton.onclick = () => {
            // 打开侧边栏
            sidebar.style.right = '0';
            
            let content = '';
            const contentLines = [];
            
            // 获取问题标题
            const questionTitle = document.querySelector('.QuestionHeader-title, .Post-Title, .ArticleItem-title');
            if (questionTitle) {
              const titleText = `标题：${questionTitle.textContent?.trim()}`;
              content += titleText + '\n\n';
              contentLines.push(titleText, '');
            }
            
            // 获取问题描述或文章描述
            let questionDetailText = '';
            const questionDetail = document.querySelector('.QuestionRichText');
            if (questionDetail) {
              questionDetailText = questionDetail.textContent?.trim() || '';
              if (questionDetailText) {
                content += `问题描述：\n${questionDetailText}\n\n`;
                contentLines.push('问题描述：', questionDetailText, '');
              }
            }
            
            // 获取所有回答内容 - 优化去重逻辑
            const answers = document.querySelectorAll('.List-item .AnswerItem, .AnswerItem');
            const processedAnswers = new Set(); // 用于去重
            
            if (answers.length > 0) {
              content += '回答内容：\n';
              contentLines.push('回答内容：');
              
              let validAnswerCount = 0;
              answers.forEach((answerItem, index) => {
                // 尝试多种选择器获取回答内容
                const contentSelectors = [
                  '.RichContent-inner',
                  '.RichText',
                  '.AnswerItem-content .RichContent',
                  '.ContentItem-content'
                ];
                
                let answerText = '';
                for (const selector of contentSelectors) {
                  const contentElement = answerItem.querySelector(selector);
                  if (contentElement) {
                    answerText = contentElement.textContent?.trim() || '';
                    break;
                  }
                }
                
                // 如果没找到内容，尝试直接获取
                if (!answerText) {
                  answerText = answerItem.textContent?.trim() || '';
                }
                
                // 去重和过滤逻辑
                if (answerText && 
                    answerText.length > 100 && 
                    !processedAnswers.has(answerText) &&
                    !answerText.includes('展开阅读全文') &&
                    !answerText.includes('显示全部')) {
                  
                  processedAnswers.add(answerText);
                  validAnswerCount++;
                  
                  const answerHeader = `--- 回答 ${validAnswerCount} ---`;
                  content += `\n${answerHeader}\n${answerText}\n`;
                  contentLines.push('', answerHeader, answerText);
                }
              });
              
              console.log(`处理了 ${answers.length} 个回答项，有效回答 ${validAnswerCount} 个`);
            }
            
            // 如果没有找到回答，尝试获取文章内容（避免与问题描述重复）
            if (answers.length === 0) {
              // 尝试多个选择器获取文章内容
              const articleSelectors = [
                '.Post-RichTextContainer .RichText',
                '.ArticleItem-content .RichText', 
                '.Post-content .RichText',
                '.RichText.ztext'
              ];
              
              let articleText = '';
              for (const selector of articleSelectors) {
                const articleElement = document.querySelector(selector);
                if (articleElement) {
                  const tempText = articleElement.textContent?.trim() || '';
                  // 确保文章内容与问题描述不重复
                  if (tempText && tempText !== questionDetailText && tempText.length > 100) {
                    articleText = tempText;
                    break;
                  }
                }
              }
              
              // 如果还是没找到，或者找到的内容太短/重复，则尝试更通用的选择器
              if (!articleText) {
                const fallbackElement = document.querySelector('.Post-RichTextContainer, .ArticleItem-content');
                if (fallbackElement) {
                  const tempText = fallbackElement.textContent?.trim() || '';
                  if (tempText && tempText !== questionDetailText && tempText.length > 100) {
                    articleText = tempText;
                  }
                }
              }
              
              if (articleText) {
                content += '文章内容：\n' + articleText + '\n';
                contentLines.push('文章内容：', articleText);
                console.log('找到文章内容，长度:', articleText.length);
              } else {
                console.log('未找到有效的文章内容或内容与描述重复');
              }
            }
            
            // 在侧边栏逐行显示内容
            const sidebarContentDiv = document.getElementById('sidebar-content');
            if (sidebarContentDiv && contentLines.length > 0) {
              displayContentLineByLine(contentLines.join('\n'), sidebarContentDiv);
            }
            
            // 存储内容供复制使用
            window.zhihuCopiedContent = content;
            
            // 按钮状态更新
            const originalText = copyButton.textContent;
            copyButton.textContent = '✓ 内容已获取';
            copyButton.style.background = '#4CAF50';
            
            setTimeout(() => {
              copyButton.textContent = originalText;
              copyButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }, 2000);
          };

          // 侧边栏事件绑定
          const setupSidebarEvents = () => {
            // 关闭侧边栏
            const closeBtn = document.getElementById('close-sidebar');
            if (closeBtn) {
              closeBtn.onclick = () => {
                sidebar.style.right = '-400px';
              };
            }
            
            // 复制全部内容
            const copyAllBtn = document.getElementById('copy-all-btn');
            if (copyAllBtn) {
              copyAllBtn.onclick = () => {
                const content = window.zhihuCopiedContent || '';
                if (content) {
                  navigator.clipboard.writeText(content).then(() => {
                    const originalText = copyAllBtn.innerHTML;
                    copyAllBtn.innerHTML = '✓ 已复制';
                    copyAllBtn.style.background = 'rgba(76,175,80,0.8)';
                    
                    setTimeout(() => {
                      copyAllBtn.innerHTML = originalText;
                      copyAllBtn.style.background = 'rgba(255,255,255,0.2)';
                    }, 2000);
                  }).catch(() => {
                    const originalText = copyAllBtn.innerHTML;
                    copyAllBtn.innerHTML = '✗ 复制失败';
                    copyAllBtn.style.background = 'rgba(244,67,54,0.8)';
                    
                    setTimeout(() => {
                      copyAllBtn.innerHTML = originalText;
                      copyAllBtn.style.background = 'rgba(255,255,255,0.2)';
                    }, 2000);
                  });
                }
              };
            }
            
            // 清空内容
            const clearBtn = document.getElementById('clear-content-btn');
            if (clearBtn) {
              clearBtn.onclick = () => {
                const sidebarContentDiv = document.getElementById('sidebar-content');
                if (sidebarContentDiv) {
                  sidebarContentDiv.innerHTML = `
                    <div style="
                      text-align: center;
                      color: #999;
                      font-style: italic;
                      margin-top: 50px;
                    ">
                      📭 内容已清空
                    </div>
                  `;
                  window.zhihuCopiedContent = '';
                  
                  const originalText = clearBtn.innerHTML;
                  clearBtn.innerHTML = '✓ 已清空';
                  
                  setTimeout(() => {
                    clearBtn.innerHTML = originalText;
                  }, 1000);
                }
              };
            }
          };

          // 添加元素到页面
          document.body.appendChild(sidebar);
          document.body.appendChild(copyButton);
          
          // 绑定事件（延迟执行确保DOM已加载）
          setTimeout(setupSidebarEvents, 100);
        },
      })
      .catch(err => {
        console.error('添加复制按钮错误:', err);
      });
  };

  const modifyZhihuStyle = async () => {
    const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });

    if (tab.url!.startsWith('about:') || tab.url!.startsWith('chrome:')) {
      chrome.notifications.create('inject-error', notificationOptions);
      return;
    }

    // 检查是否是知乎页面
    if (!tab.url!.includes('zhihu.com')) {
      chrome.notifications.create('zhihu-error', {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icon-34.png'),
        title: '修改知乎样式错误',
        message: '请在知乎页面使用此功能！',
      });
      return;
    }

    await chrome.scripting
      .executeScript({
        target: { tabId: tab.id! },
        func: () => {
          // 恢复页面默认颜色
          document.body.style.backgroundColor = '';
          document.body.style.removeProperty('background-color');
          
          const mainContent = document.querySelector('[data-za-detail-view-id="3005"]');
          if (mainContent) {
            (mainContent as HTMLElement).style.backgroundColor = '';
            (mainContent as HTMLElement).style.removeProperty('background-color');
          }
          
          const header = document.querySelector('.AppHeader');
          if (header) {
            (header as HTMLElement).style.backgroundColor = '';
            (header as HTMLElement).style.removeProperty('background-color');
          }
          
          const cards = document.querySelectorAll('.Card, .ContentItem, .QuestionItem');
          cards.forEach(card => {
            (card as HTMLElement).style.backgroundColor = '';
            (card as HTMLElement).style.removeProperty('background-color');
          });
          
          // 恢复所有可能被修改的元素颜色
          const allElements = document.querySelectorAll('*');
          allElements.forEach(element => {
            const el = element as HTMLElement;
            if (el.style.backgroundColor && 
                (el.style.backgroundColor.includes('#ff') || 
                 el.style.backgroundColor.includes('pink'))) {
              el.style.backgroundColor = '';
              el.style.removeProperty('background-color');
            }
          });
          
          // 修改所有QuestionHeader-title类名的元素文本
          const questionTitles = document.querySelectorAll('.QuestionHeader-title');
          questionTitles.forEach(titleElement => {
            console.log('找到QuestionHeader-title元素:', titleElement.textContent);
            titleElement.textContent = 'AI大模型开发项目文档';
          });
          
          // 修改所有css-j3g3pk类名的元素文本
          const cssJ3g3pkElements = document.querySelectorAll('.css-j3g3pk');
          cssJ3g3pkElements.forEach(element => {
            console.log('找到css-j3g3pk元素:', element.textContent);
            element.textContent = 'AI大模型开发项目文档';
          });
          
          // 移除QuestionHeader-side和Question-sideColumn元素
          const elementsToRemove = document.querySelectorAll('.QuestionHeader-side, .Question-sideColumn');
          elementsToRemove.forEach(element => {
            console.log('移除元素:', element.className);
            element.remove();
          });
          
          // 移除id为Popover8-toggle的按钮
          const popoverToggle = document.getElementById('Popover8-toggle');
          if (popoverToggle) {
            console.log('移除Popover8-toggle按钮:', popoverToggle);
            popoverToggle.remove();
          }
          
          // 隐藏Post-Row-Content-left-article类名元素中的所有视频和图片
          const articleElements = document.querySelectorAll('.Post-Row-Content-left-article');
          articleElements.forEach(article => {
            // 隐藏图片
            const images = article.querySelectorAll('img, picture, [class*="image"], [class*="Image"]');
            images.forEach(img => {
              console.log('隐藏图片:', img);
              (img as HTMLElement).style.setProperty('display', 'none', 'important');
            });
            
            // 隐藏视频
            const videos = article.querySelectorAll('video, iframe, [class*="video"], [class*="Video"], [class*="player"], [class*="Player"]');
            videos.forEach(video => {
              console.log('隐藏视频:', video);
              (video as HTMLElement).style.setProperty('display', 'none', 'important');
            });
            
            console.log(`在文章中隐藏了 ${images.length} 个图片和 ${videos.length} 个视频`);
          });
          
          // 优化的用户卡片隐藏功能 - 避免影响回答内容
          console.log('=== 开始优化的用户卡片隐藏功能 ===');
          
          // 只隐藏作者信息卡片，不影响回答内容
          const authorCardSelectors = [
            '.Card-section .AuthorCard',           // 只隐藏Card-section下的AuthorCard
            '.AuthorCard-user',                    // 作者用户信息
            '.AnswerItem .AuthorInfo',             // 回答中的作者信息（如果存在）
            '.ContentItem .AuthorInfo'             // 内容项中的作者信息
          ];
          
          authorCardSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            console.log(`作者信息选择器 ${selector} 找到 ${elements.length} 个元素`);
            elements.forEach(element => {
              // 检查是否是回答内容的一部分，如果是则保留
              const isPartOfAnswer = element.closest('.List-item, .AnswerItem, .Answer');
              if (!isPartOfAnswer) {
                console.log('隐藏作者信息元素:', element.className);
                (element as HTMLElement).style.setProperty('display', 'none', 'important');
              } else {
                console.log('保留回答中的作者信息:', element.className);
              }
            });
          });
          
          // 特别处理：只隐藏独立的Card-section，保留回答中的内容
          const cardSections = document.querySelectorAll('.Card-section');
          cardSections.forEach(cardSection => {
            // 检查是否包含AuthorCard但不是回答的一部分
            const hasAuthorCard = cardSection.querySelector('.AuthorCard');
            const isPartOfAnswerList = cardSection.closest('.List-item, .AnswerItem, .Answer');
            
            if (hasAuthorCard && !isPartOfAnswerList) {
              console.log('隐藏独立的作者卡片区域');
              (cardSection as HTMLElement).style.setProperty('display', 'none', 'important');
            }
          });
          
          console.log('=== 优化的用户卡片隐藏功能执行完成 ===');
          
          // 防止重复替换logo - 添加标记检查
          if (!document.querySelector('.feishu-logo-replaced')) {
            console.log('开始替换知乎logo为飞书云文档logo');
            
            // 更精确的logo选择器，避免重复替换
            const zhihuLogos = document.querySelectorAll('svg[viewBox="0 0 64 30"]:not(.feishu-logo-replaced)');
            let logoReplaceCount = 0;
            
            zhihuLogos.forEach((logo, index) => {
              if (logo.innerHTML.includes('M29.05 4.582H16.733V25.94h3.018l.403 2.572') && logoReplaceCount < 1) {
                console.log(`替换第 ${index + 1} 个知乎logo`);
                
                // 标记已替换，防止重复
                logo.classList.add('feishu-logo-replaced');
                
                // 找到logo的父容器
                const logoParent = logo.parentElement;
                
                // 替换SVG内容
                logo.innerHTML = `
                  <path d="m12.924 12.803.056-.054c.038-.034.076-.072.11-.11l.077-.076.23-.227 1.334-1.319.335-.331c.063-.063.13-.123.195-.183a7.777 7.777 0 0 1 1.823-1.24 7.607 7.607 0 0 1 1.014-.4 13.177 13.177 0 0 0-2.5-5.013 1.203 1.203 0 0 0-.94-.448h-9.65c-.173 0-.246.224-.107.325a28.23 28.23 0 0 1 8 9.098c.007-.006.016-.013.023-.022Z" fill="#00D6B9"></path>
                  <path d="M9.097 21.299a13.258 13.258 0 0 0 11.82-7.247 5.576 5.576 0 0 1-.731 1.076 5.315 5.315 0 0 1-.745.7 5.117 5.117 0 0 1-.615.404 4.626 4.626 0 0 1-.726.331 5.312 5.312 0 0 1-1.883.312 5.892 5.892 0 0 1-.524-.031 6.509 6.509 0 0 1-.729-.126c-.06-.016-.12-.029-.18-.044-.166-.044-.33-.092-.494-.14-.082-.024-.164-.046-.246-.072-.123-.038-.247-.072-.366-.11l-.3-.095-.284-.094-.192-.067c-.08-.025-.155-.053-.234-.082a3.49 3.49 0 0 1-.167-.06c-.11-.04-.221-.079-.328-.12-.063-.025-.126-.047-.19-.072l-.252-.098c-.088-.035-.18-.07-.268-.107l-.174-.07c-.072-.028-.141-.06-.214-.088l-.164-.07c-.057-.024-.114-.05-.17-.075l-.149-.066-.135-.06-.14-.063a90.183 90.183 0 0 1-.141-.066 4.808 4.808 0 0 0-.18-.083c-.063-.028-.123-.06-.186-.088a5.697 5.697 0 0 1-.199-.098 27.762 27.762 0 0 1-8.067-5.969.18.18 0 0 0-.312.123l.006 9.21c0 .4.199.779.533 1a13.177 13.177 0 0 0 7.326 2.205Z" fill="#3370FF"></path>
                  <path d="M23.732 9.295a7.55 7.55 0 0 0-3.35-.776 7.521 7.521 0 0 0-2.284.35c-.054.016-.107.035-.158.05a8.297 8.297 0 0 0-.855.35 7.14 7.14 0 0 0-.552.297 6.716 6.716 0 0 0-.533.347c-.123.089-.243.18-.363.275-.13.104-.252.211-.375.321-.067.06-.13.123-.196.184l-.334.328-1.338 1.321-.23.228-.076.075c-.038.038-.076.073-.11.11l-.057.054a1.914 1.914 0 0 1-.085.08c-.032.028-.063.06-.095.088a13.286 13.286 0 0 1-2.748 1.946c.06.028.12.057.18.082l.142.066c.044.022.091.041.139.063l.135.06.149.067.17.075.164.07c.073.031.142.06.215.088.056.025.116.047.173.07.088.034.177.072.268.107.085.031.168.066.253.098l.189.072c.11.041.218.082.328.12.057.019.11.041.167.06.08.028.155.053.234.082l.192.066.284.095.3.095c.123.037.243.075.366.11l.246.072c.164.048.331.095.495.14.06.015.12.03.18.043.114.029.227.05.34.07.13.022.26.04.389.057a5.815 5.815 0 0 0 .994.019 5.172 5.172 0 0 0 1.413-.3 5.405 5.405 0 0 0 .726-.334c.06-.035.122-.07.182-.108a7.96 7.96 0 0 0 .432-.297 5.362 5.362 0 0 0 .577-.517 5.285 5.285 0 0 0 .37-.429 5.797 5.797 0 0 0 .527-.827l.13-.258 1.166-2.325-.003.006a7.391 7.391 0 0 1 1.527-2.186Z" fill="#133C9A"></path>
                `;
                logo.setAttribute('viewBox', '0 0 24 24');
                logo.setAttribute('width', '28');
                logo.setAttribute('height', '28');
                logo.removeAttribute('fill');
                
                // 添加"飞书云文档"文字，完美摸鱼伪装
                if (logoParent && !logoParent.querySelector('.feishu-text')) {
                  const textSpan = document.createElement('span');
                  textSpan.className = 'feishu-text';
                  textSpan.textContent = '飞书云文档';
                  textSpan.style.cssText = `
                    margin-left: 6px;
                    font-size: 15px;
                    font-weight: 500;
                    color: #1f2329;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    line-height: 1;
                    white-space: nowrap;
                    display: inline-block;
                  `;
                  logoParent.appendChild(textSpan);
                  
                  // 调整父容器样式，确保一行显示
                  logoParent.style.display = 'inline-flex';
                  logoParent.style.alignItems = 'center';
                  logoParent.style.whiteSpace = 'nowrap';
                  logoParent.style.height = '30px';
                }
                
                logoReplaceCount++;
              }
            });
            
            console.log(`总共替换了 ${logoReplaceCount} 个logo`);
            
            // 在body上添加全局标记，防止重复执行
            document.body.classList.add('feishu-logo-replaced');
          } else {
            console.log('Logo已经替换过，跳过重复操作');
          }
        },
      })
      .catch(err => {
        console.error('执行脚本错误:', err);
      });
  };

  return (
    <div className={cn('App', isLight ? 'bg-slate-50' : 'bg-gray-800')}>
      <header className={cn('App-header', isLight ? 'text-gray-900' : 'text-gray-100')}>
        <button onClick={goGithubSite}>
          <img src={chrome.runtime.getURL(logo)} className="App-logo" alt="logo" />
        </button>
        <p>
          Edit <code>pages/popup/src/Popup.tsx</code>
        </p>
        <button
          className={cn(
            'mt-4 rounded px-4 py-1 font-bold shadow hover:scale-105',
            isLight ? 'bg-blue-200 text-black' : 'bg-gray-700 text-white',
          )}
          onClick={injectContentScript}>
          {t('injectButton')}
        </button>
        <button
          className={cn(
            'mt-2 rounded px-4 py-1 font-bold shadow hover:scale-105',
            isLight ? 'bg-pink-200 text-black' : 'bg-pink-700 text-white',
          )}
          onClick={modifyZhihuStyle}>
          修改知乎样式
        </button>
        <button
          className={cn(
            'mt-2 rounded px-4 py-1 font-bold shadow hover:scale-105',
            isLight ? 'bg-green-200 text-black' : 'bg-green-700 text-white',
          )}
          onClick={addCopyButton}>
          添加复制按钮
        </button>
        <ToggleButton>{t('toggleTheme')}</ToggleButton>
      </header>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);